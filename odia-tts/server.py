import os
import html
import logging
import tempfile
from io import BytesIO
from typing import AsyncIterator, Optional
from fastapi import FastAPI, Query, Body
from fastapi.responses import JSONResponse, StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware

# Try Edge-TTS import
try:
    import edge_tts
    EDGE_AVAILABLE = True
except ImportError:
    EDGE_AVAILABLE = False
    print(" Edge-TTS not available, using offline only")

# Windows TTS fallback
try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    PYTTSX3_AVAILABLE = False
    print(" pyttsx3 not available")

APP_NAME = "ODIA Nigerian TTS Service"
DEFAULT_VOICE = os.getenv("ODIA_TTS_VOICE", "en-NG-EzinneNeural")
MAX_TEXT_LEN = 5000

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("odia_tts")

app = FastAPI(title=APP_NAME, version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "HEAD", "OPTIONS", "POST"],
    allow_headers=["*"]
)

def _pct(s: Optional[str], fallback: int = 0) -> int:
    """Parse percentage, handle +/- signs properly"""
    if not s:
        return fallback
    s = str(s).strip().replace("%", "")
    try:
        return max(-100, min(100, int(s)))
    except:
        return fallback

def _fmt_pct(n: int) -> str:
    """Format percentage with proper +/- sign for Edge-TTS"""
    return f"{int(n):+d}%"

def _clean_text(text: str) -> str:
    """Clean and validate text input"""
    if not text:
        return ""
    return html.escape(str(text).strip())[:MAX_TEXT_LEN]

async def _edge_tts_generate(text: str, voice: str, rate: int, volume: int) -> bytes:
    """Generate TTS using Edge-TTS"""
    if not EDGE_AVAILABLE:
        raise Exception("Edge-TTS not available")
    
    rate_str = _fmt_pct(rate)
    volume_str = _fmt_pct(volume)
    
    communicate = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate=rate_str,
        volume=volume_str
    )
    
    audio_data = BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.write(chunk["data"])
    
    return audio_data.getvalue()

def _windows_tts_generate(text: str) -> bytes:
    """Fallback Windows TTS"""
    if not PYTTSX3_AVAILABLE:
        raise Exception("pyttsx3 not available")
    
    engine = pyttsx3.init()
    
    # Set voice properties for better quality
    voices = engine.getProperty('voices')
    if voices:
        # Try to find a female voice
        for voice in voices:
            if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                engine.setProperty('voice', voice.id)
                break
    
    engine.setProperty('rate', 180)  # Slightly faster
    engine.setProperty('volume', 0.9)
    
    # Create temporary WAV file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
    temp_path = temp_file.name
    temp_file.close()
    
    try:
        engine.save_to_file(text, temp_path)
        engine.runAndWait()
        
        with open(temp_path, "rb") as f:
            audio_data = f.read()
        
        return audio_data
    finally:
        try:
            os.unlink(temp_path)
        except:
            pass

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": " ODIA TTS Service Running",
        "service": APP_NAME,
        "default_voice": DEFAULT_VOICE,
        "edge_tts_available": EDGE_AVAILABLE,
        "windows_tts_available": PYTTSX3_AVAILABLE,
        "nigerian_voices": [
            "en-NG-EzinneNeural",
            "en-NG-AbeoNeural", 
            "yo-NG-AdeolaNeural",
            "ig-NG-ChiamakaNeural",
            "ha-NG-AbubakarNeural"
        ]
    }

@app.head("/health")
async def health_head():
    return Response(status_code=200)

@app.get("/speak")
async def speak_get(
    text: str = Query(..., description="Text to synthesize"),
    voice: str = Query(DEFAULT_VOICE, description="Voice to use"),
    rate: Optional[str] = Query("0", description="Speech rate (-100 to 100)"),
    volume: Optional[str] = Query("0", description="Volume (-100 to 100)"),
    mode: Optional[str] = Query("stream", description="Response mode: stream or file")
):
    """GET endpoint for TTS"""
    return await _synthesize_audio(text, voice, rate, volume, mode)

@app.post("/synthesize") 
async def synthesize_post(body: dict = Body(...)):
    """POST endpoint for TTS"""
    text = body.get("text", "")
    voice = body.get("voice", DEFAULT_VOICE)
    rate = body.get("rate", "0")
    volume = body.get("volume", "0")
    mode = body.get("mode", "file")
    
    return await _synthesize_audio(text, voice, rate, volume, mode)

async def _synthesize_audio(text: str, voice: str, rate: str, volume: str, mode: str):
    """Core TTS synthesis logic"""
    try:
        clean_text = _clean_text(text)
        if not clean_text:
            return JSONResponse(
                {"error": "Empty or invalid text"}, 
                status_code=400
            )
        
        rate_pct = _pct(rate, 0)
        volume_pct = _pct(volume, 0)
        
        # Try Edge-TTS first (better quality)
        audio_data = None
        audio_type = "audio/mpeg"
        voice_used = voice
        
        if EDGE_AVAILABLE:
            try:
                logger.info(f" Generating with Edge-TTS: {voice}")
                audio_data = await _edge_tts_generate(clean_text, voice, rate_pct, volume_pct)
                logger.info(" Edge-TTS success")
            except Exception as e:
                logger.warning(f" Edge-TTS failed: {e}")
        
        # Fallback to Windows TTS
        if not audio_data and PYTTSX3_AVAILABLE:
            try:
                logger.info(" Using Windows TTS fallback")
                audio_data = _windows_tts_generate(clean_text)
                audio_type = "audio/wav"
                voice_used = "Windows-Offline"
                logger.info(" Windows TTS success")
            except Exception as e:
                logger.error(f" Windows TTS failed: {e}")
        
        if not audio_data:
            return JSONResponse(
                {"error": "All TTS engines failed"}, 
                status_code=500
            )
        
        headers = {
            "X-ODIA-Voice": voice_used,
            "X-ODIA-Service": "Nigerian-TTS",
            "Cache-Control": "no-store"
        }
        
        return Response(
            content=audio_data,
            media_type=audio_type,
            headers=headers
        )
        
    except Exception as e:
        logger.exception(f" Synthesis error: {e}")
        return JSONResponse(
            {"error": f"Synthesis failed: {str(e)}"}, 
            status_code=500
        )

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("ODIA_TTS_HOST", "127.0.0.1")
    port = int(os.getenv("ODIA_TTS_PORT", "5500"))
    
    print(f" Starting ODIA TTS Service on {host}:{port}")
    print(f" Default Nigerian Voice: {DEFAULT_VOICE}")
    
    uvicorn.run(
        "server:app", 
        host=host, 
        port=port, 
        reload=False,
        log_level="info"
    )
