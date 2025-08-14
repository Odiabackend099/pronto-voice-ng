# Write the full server.py in one shot (PS5-safe)
@'
import os, html, logging, asyncio, tempfile
from io import BytesIO
from typing import AsyncIterator, Optional
from fastapi import FastAPI, Query, Body
from fastapi.responses import JSONResponse, StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
import edge_tts

APP_NAME = "ODIA TTS (Edge only)"
DEFAULT_VOICE = os.getenv("ODIA_TTS_VOICE","en-NG-EzinneNeural")
MAX_TEXT_LEN = 5000
logger = logging.getLogger("odia_tts")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title=APP_NAME, version="1.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=False,
    allow_methods=["GET","HEAD","OPTIONS","POST"], allow_headers=["*"]
)

def _pct(s: Optional[str], fallback: int = 0) -> int:
    """Parse a percent-like value into an int within [-100, 100]."""
    if s is None:
        return fallback
    s = str(s).strip().replace("%","").replace("+","")
    try:
        n = int(s)
    except Exception:
        return fallback
    return max(-100, min(100, n))

def _sign(v: int) -> str:
    """Return signed percent string required by edge-tts (e.g. '+0%', '-20%')."""
    return f"{v:+d}%"

def _clean(t: str) -> str:
    return html.escape((t or "").strip())[:MAX_TEXT_LEN]

async def _edge_stream(text:str, voice:str, rate_pct:int, vol_pct:int) -> AsyncIterator[bytes]:
    comm = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate=_sign(rate_pct),
        volume=_sign(vol_pct),
    )
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            yield chunk["data"]

async def _edge_buffer(text:str, voice:str, rate_pct:int, vol_pct:int) -> bytes:
    buf = BytesIO()
    comm = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate=_sign(rate_pct),
        volume=_sign(vol_pct),
    )
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    return buf.getvalue()

def _offline_wav(text:str) -> bytes:
    """Windows offline fallback via SAPI5 (pyttsx3) -> WAV bytes."""
    import pyttsx3
    eng = pyttsx3.init()
    # You can choose a specific local voice here if needed using eng.setProperty('voice', id)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tf:
        tmp = tf.name
    try:
        eng.save_to_file(text, tmp)
        eng.runAndWait()
        with open(tmp, "rb") as f:
            data = f.read()
        return data
    finally:
        try:
            os.remove(tmp)
        except Exception:
            pass

@app.get("/health")
async def health():
    return {"ok": True, "service": APP_NAME, "voice": DEFAULT_VOICE}

@app.head("/health")
async def health_head():
    return Response(status_code=200)

@app.get("/voices")
async def voices():
    """List Edge voices (quick filter for Nigerian voices)."""
    try:
        allv = await edge_tts.list_voices()
        ng = [v for v in allv if v["ShortName"].startswith("en-NG")]
        return {"ok": True, "voices": ng}
    except Exception as e:
        logger.warning("list_voices failed: %s", e)
        return {"ok": False, "error": "list_failed"}

# GET /speak
# - Default: streaming (for web playback)
# - mode=file: non-streaming (PowerShell/curl friendly)
# If Edge fails, we return a clear 400 with detail,
# and for file-mode we fall back to offline WAV so it always returns audio.
@app.get("/speak")
async def speak(
    text: str = Query(...),
    voice: str = Query(DEFAULT_VOICE),
    rate: Optional[str] = Query(None),
    volume: Optional[str] = Query(None),
    mode: Optional[str] = Query(None)
):
    txt = _clean(text)
    if not txt:
        return JSONResponse({"ok": False, "error": "empty_text"}, status_code=400)

    rate_pct = _pct(rate, 0)
    vol_pct  = _pct(volume, 0)

    if mode == "file":
        # Non-streaming: if Edge fails, use offline WAV fallback
        try:
            audio = await _edge_buffer(txt, voice, rate_pct, vol_pct)
            return Response(content=audio, media_type="audio/mpeg",
                            headers={"Cache-Control":"no-store","X-ODIA-Voice":voice})
        except Exception as e:
            logger.warning("Edge TTS (file mode) failed: %s", e)
            audio = _offline_wav(txt)
            return Response(content=audio, media_type="audio/wav",
                            headers={"Cache-Control":"no-store","X-ODIA-Fallback":"pyttsx3"})

    # Streaming (web)
    async def gen():
        async for b in _edge_stream(txt, voice, rate_pct, vol_pct):
            yield b

    try:
        return StreamingResponse(gen(), media_type="audio/mpeg",
                                 headers={"Cache-Control": "no-store", "X-ODIA-Voice": voice})
    except Exception as e:
        logger.warning("Edge TTS (stream) failed: %s", e)
        # For streaming we return a simple JSON error (widget can retry or switch to file-mode)
        return JSONResponse({"ok": False, "error": "edge_tts_failed", "detail": str(e)}, status_code=400)

@app.post("/synthesize")
async def synthesize(body: dict = Body(...)):
    txt    = _clean(str(body.get("text","")))
    voice  = body.get("voice") or DEFAULT_VOICE
    rate   = _pct(body.get("rate"), 0)
    volume = _pct(body.get("volume"), 0)
    if not txt:
        return JSONResponse({"ok": False, "error": "empty_text"}, status_code=400)
    try:
        audio = await _edge_buffer(txt, voice, rate, volume)
        return Response(content=audio, media_type="audio/mpeg",
                        headers={"Cache-Control":"no-store","X-ODIA-Voice":voice})
    except Exception as e:
        logger.warning("Edge TTS (synthesize) failed: %s", e)
        audio = _offline_wav(txt)
        return Response(content=audio, media_type="audio/wav",
                        headers={"Cache-Control":"no-store","X-ODIA-Fallback":"pyttsx3"})

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("ODIA_TTS_HOST","127.0.0.1")
    port = int(os.getenv("ODIA_TTS_PORT","5500"))
    uvicorn.run("server:app", host=host, port=port, reload=False)
'@ | Set-Content -Encoding UTF8 "C:\Users\OD~IA\Downloads\pronto-voice-ng\odia-tts\server.py"
