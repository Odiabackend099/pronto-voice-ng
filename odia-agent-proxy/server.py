import os, json, io, httpx
from typing import Optional
from fastapi import FastAPI, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

APP='CrossAI Agent Proxy'
OPENAI_KEY = os.getenv('OPENAI_API_KEY','')  # optional; if missing we echo
TTS_BASE   = os.getenv('ODIA_TTS_BASE','http://127.0.0.1:5500')  # local dev default

app = FastAPI(title=APP, version='2.0')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['GET','POST','OPTIONS'],
    allow_headers=['*']
)

@app.get('/health')
def health():
    return {'ok': True, 'service': APP, 'tts_base': TTS_BASE, 'openai': bool(OPENAI_KEY)}

@app.post('/reply')
def reply(body: dict = Body(...)):
    user = (body or {}).get('text','').strip()
    if not user: return JSONResponse({'error':'empty'}, status_code=400)
    # If OPENAI_KEY configured, call model here; else echo safely
    if not OPENAI_KEY:
        return {'text': f"You said: {user}"}
    # Minimal safe completion (server-side) â€“ replace with your preferred OpenAI call
    try:
        import requests
        headers={'Authorization': f'Bearer {OPENAI_KEY}', 'Content-Type':'application/json'}
        data={"model":"gpt-4o-mini","messages":[{"role":"system","content":"Answer briefly in Nigerian friendly tone."},{"role":"user","content":user}]}
        r = requests.post('https://api.openai.com/v1/chat/completions', headers=headers, json=data, timeout=20)
        j = r.json()
        txt = j.get('choices',[{}])[0].get('message',{}).get('content','')
        return {'text': txt or f"You said: {user}"}
    except Exception:
        return {'text': f"You said: {user}"}

# HTTPS-safe TTS passthrough so browsers don't hit mixed-content
@app.get('/tts')
def tts_get(
    text: str = Query(...),
    voice: str = Query('en-NG-EzinneNeural'),
    mode: Optional[str] = Query('file')
):
    # Call ODIA TTS and return bytes with correct type
    url = f"{TTS_BASE}/speak"
    try:
        with httpx.Client(timeout=30.0) as cx:
            r = cx.get(url, params={'text': text, 'voice': voice, 'mode': mode})
            if r.status_code != 200:
                return JSONResponse({'error':'tts_upstream','status':r.status_code}, status_code=502)
            mt = r.headers.get('content-type','audio/mpeg')
            return Response(content=r.content, media_type=mt, headers={'Cache-Control':'no-store','X-Proxy':'tts'})
    except Exception as e:
        return JSONResponse({'error':'tts_proxy', 'detail':str(e)}, status_code=502)
