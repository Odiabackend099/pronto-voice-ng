import html
from typing import Optional
from fastapi import FastAPI, Query, Body
from fastapi.responses import Response, JSONResponse
import edge_tts

app = FastAPI(title="CrossAI TTS", version="1.0.0")
MAX_TEXT_LEN = 5000

def _pct(x, d=0):
    try:
        return max(-100, min(100, int(str(x).replace("%",""))))
    except:
        return d

def _clean(t: Optional[str]) -> str:
    return html.escape((t or "").strip())[:MAX_TEXT_LEN]

async def _edge_buffer(text: str, voice: str, rate: int, volume: int) -> bytes:
    buf = bytearray()
    comm = edge_tts.Communicate(text=text, voice=voice, rate=f"{rate:+d}%", volume=f"{volume:+d}%")
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            buf.extend(chunk["data"])
    return bytes(buf)

@app.get("/")
async def tts_get(
    text: str,
    voice: str = "en-NG-EzinneNeural",
    rate: str = "0",
    volume: str = "0",
):
    text = _clean(text)
    if not text:
        return JSONResponse({"ok": False, "error": "empty_text"}, status_code=400)
    audio = await _edge_buffer(text, voice, _pct(rate), _pct(volume))
    return Response(content=audio, media_type="audio/mpeg", headers={"Cache-Control":"no-store"})

@app.post("/")
async def tts_post(body: dict = Body(...)):
    text = _clean(str(body.get("text","")))
    voice = body.get("voice","en-NG-EzinneNeural")
    rate = _pct(body.get("rate","0"))
    volume = _pct(body.get("volume","0"))
    if not text:
        return JSONResponse({"ok": False, "error": "empty_text"}, status_code=400)
    audio = await _edge_buffer(text, voice, rate, volume)
    return Response(content=audio, media_type="audio/mpeg", headers={"Cache-Control":"no-store"})
