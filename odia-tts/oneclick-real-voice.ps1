param([string]\en-NG-EzinneNeural = 'en-NG-EzinneNeural')

# 0) Paths
\C:\Users\OD~IA\Downloads\pronto-voice-ng\odia-tts   = 'C:\Users\OD~IA\Downloads\pronto-voice-ng\odia-tts'
if(-not (Test-Path \C:\Users\OD~IA\Downloads\pronto-voice-ng\odia-tts)){ Write-Host "Folder not found: \C:\Users\OD~IA\Downloads\pronto-voice-ng\odia-tts" -ForegroundColor Red; exit 1 }
\   = Join-Path \C:\Users\OD~IA\Downloads\pronto-voice-ng\odia-tts '.venv'
\ = Join-Path \ 'Scripts\python.exe'
\ = Join-Path \C:\Users\OD~IA\Downloads\pronto-voice-ng\odia-tts 'server.py'

# 1) Write robust server.py (Edge + Offline + +0% fix)
@'
import os, html, logging, asyncio, tempfile
from io import BytesIO
from typing import AsyncIterator, Optional
from fastapi import FastAPI, Query, Body
from fastapi.responses import JSONResponse, StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
import edge_tts

APP_NAME = "ODIA TTS (Edge + Offline)"
DEFAULT_VOICE = os.getenv("ODIA_TTS_VOICE","en-NG-EzinneNeural")
MAX_TEXT_LEN = 5000
logger = logging.getLogger("odia_tts")

app = FastAPI(title=APP_NAME, version="1.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=False,
    allow_methods=["GET","HEAD","OPTIONS","POST"], allow_headers=["*"]
)

def _pct(s: Optional[str], fallback: int=0) -> int:
    """Parse %, clamp to [-100,100]. Accepts '0', '+0', '-10', '25%'."""
    if not s: return fallback
    s = str(s).strip().replace("%","")
    try:
        n = int(s)
    except Exception:
        return fallback
    return max(-100, min(100, n))

def _fmt_pct(n: int) -> str:
    """Always include sign, Edge expects +0%/-0% style."""
    return f"{int(n):+d}%"

def _clean(t: str) -> str:
    return html.escape((t or "").strip())[:MAX_TEXT_LEN]

async def _edge_stream(text:str, voice:str, rate_pct:int, vol_pct:int) -> AsyncIterator[bytes]:
    comm = edge_tts.Communicate(text=text, voice=voice,
                                rate=_fmt_pct(rate_pct), volume=_fmt_pct(vol_pct))
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            yield chunk["data"]

async def _edge_buffer(text:str, voice:str, rate_pct:int, vol_pct:int) -> bytes:
    buf = BytesIO()
    comm = edge_tts.Communicate(text=text, voice=voice,
                                rate=_fmt_pct(rate_pct), volume=_fmt_pct(vol_pct))
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    return buf.getvalue()

def _offline_wav(text:str) -> bytes:
    """Windows offline fallback via SAPI5 (pyttsx3)."""
    import pyttsx3
    eng = pyttsx3.init()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tf:
        tmp = tf.name
    try:
        eng.save_to_file(text, tmp)
        eng.runAndWait()
        with open(tmp, "rb") as f:
            data = f.read()
        return data
    finally:
        try: os.remove(tmp)
        except: pass

@app.get("/health")
async def health():
    return {"ok": True, "service": APP_NAME, "voice": DEFAULT_VOICE}

@app.head("/health")
async def health_head():
    return Response(status_code=200)

@app.get("/speak")
async def speak(
    text: str = Query(...),
    voice: str = Query(DEFAULT_VOICE),
    rate: Optional[str] = Query(None),
    volume: Optional[str] = Query(None),
    mode: Optional[str] = Query(None)
):
    try:
        txt = _clean(text)
        if not txt:
            return JSONResponse({"ok": False, "error":"empty_text"}, status_code=400)
        rate_pct = _pct(rate, 0)
        vol_pct  = _pct(volume, 0)

        if mode == "file":
            try:
                audio = await _edge_buffer(txt, voice, rate_pct, vol_pct)
                return Response(content=audio, media_type="audio/mpeg",
                                headers={"Cache-Control":"no-store","X-ODIA-Voice":voice})
            except Exception as e:
                logger.warning("Edge TTS failed in file mode, using offline WAV: %s", e)
                audio = _offline_wav(txt)
                return Response(content=audio, media_type="audio/wav",
                                headers={"Cache-Control":"no-store","X-ODIA-Fallback":"pyttsx3"})

        async def gen():
            try:
                async for b in _edge_stream(txt, voice, rate_pct, vol_pct):
                    yield b
            except Exception as e:
                logger.warning("Edge stream error, switching to offline WAV: %s", e)
                yield _offline_wav(txt)

        return StreamingResponse(gen(), media_type="audio/mpeg",
                                 headers={"Cache-Control":"no-store","X-ODIA-Voice":voice})

    except Exception as e:
        logger.exception("Unhandled /speak: %s", e)
        audio = _offline_wav(_clean(text or "System error, but voice fallback works."))
        return Response(content=audio, media_type="audio/wav",
                        headers={"Cache-Control":"no-store","X-ODIA-Fallback":"pyttsx3"})

@app.post("/synthesize")
async def synthesize(body: dict = Body(...)):
    try:
        txt    = _clean(str(body.get("text","")))
        voice  = body.get("voice") or DEFAULT_VOICE
        rate   = _pct(body.get("rate"), 0)
        volume = _pct(body.get("volume"), 0)
        if not txt:
            return JSONResponse({"ok": False, "error":"empty_text"}, status_code=400)
        try:
            audio = await _edge_buffer(txt, voice, rate, volume)
            return Response(content=audio, media_type="audio/mpeg",
                            headers={"Cache-Control":"no-store","X-ODIA-Voice":voice})
        except Exception as e:
            logger.warning("Edge TTS synth failed, offline WAV: %s", e)
            audio = _offline_wav(txt)
            return Response(content=audio, media_type="audio/wav",
                            headers={"Cache-Control":"no-store","X-ODIA-Fallback":"pyttsx3"})
    except Exception as e:
        logger.exception("Unhandled /synthesize: %s", e)
        audio = _offline_wav(_clean(str(body.get("text","System error"))))
        return Response(content=audio, media_type="audio/wav",
                        headers={"Cache-Control":"no-store","X-ODIA-Fallback":"pyttsx3"})

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("ODIA_TTS_HOST","127.0.0.1")
    port = int(os.getenv("ODIA_TTS_PORT","5500"))
    uvicorn.run("server:app", host=host, port=port, reload=False)
'@ | Set-Content -Encoding UTF8 \

# 2) Ensure venv + deps
if(-not (Test-Path \)){
  py -3 -m venv \ 2>\; if(-not (Test-Path \)){ python -m venv \ }
}
& \ -m pip install --upgrade pip  *> \
& \ -m pip install fastapi==0.115.0 uvicorn==0.30.6 edge-tts==6.1.12 python-dotenv==1.0.1 pyttsx3 comtypes pypiwin32 pywin32

# 3) Kill anything on :5500
try{
  \ = (Get-NetTCPConnection -LocalPort 5500 -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
  if(\){ Stop-Process -Id \ -Force -ErrorAction SilentlyContinue }
}catch{}

# 4) Start service with desired Nigerian voice
\System.Management.Automation.Internal.Host.InternalHost  = '127.0.0.1'
\5500  = '5500'
\en-NG-EzinneNeural = \en-NG-EzinneNeural
Start-Process -WorkingDirectory \C:\Users\OD~IA\Downloads\pronto-voice-ng\odia-tts -FilePath \ -ArgumentList @('-m','uvicorn','server:app','--host','127.0.0.1','--port','5500')

# 5) Wait for health
function ok(\){ try{ (Invoke-RestMethod -Uri \ -TimeoutSec 5) -ne \ }catch{ \False } }
for(\40=1;\40 -le 40;\40++){ if(ok 'http://127.0.0.1:5500/health'){ break } Start-Sleep -Milliseconds 300 }

# 6) Test (file mode, explicit +0% to be safe)
\ = Join-Path \C:\Users\OD~IA\AppData\Local\Temp 'tts_ok.wav'
Remove-Item \ -ErrorAction SilentlyContinue
try{
  Invoke-WebRequest "http://127.0.0.1:5500/speak?mode=file&text=How%20far%20na%3F&voice=\en-NG-EzinneNeural&rate=%2B0&volume=%2B0" -OutFile \ -TimeoutSec 25 -UseBasicParsing
}catch{}
if(Test-Path \){
  Write-Host "Saved: \" -ForegroundColor Green
  Start-Process \
}else{
  Write-Host "Test synth failed (check the service window for logs)." -ForegroundColor Yellow
}

# 7) Print health
try{ Invoke-RestMethod http://127.0.0.1:5500/health | Format-List * }catch{}
