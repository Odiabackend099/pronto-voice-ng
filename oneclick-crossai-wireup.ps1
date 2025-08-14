# oneclick-crossai-wireup.ps1
$ErrorActionPreference = 'Stop'

# --- Paths ---
$repo = Join-Path $HOME 'Downloads\pronto-voice-ng'
$public = Join-Path $repo 'public'
$agentDir = Join-Path $repo 'odia-agent-proxy'
$ttsDir   = Join-Path $repo 'odia-tts'

if(!(Test-Path $repo)){ throw "Repo not found at $repo" }
if(!(Test-Path $public)){ New-Item -ItemType Directory -Force -Path $public | Out-Null }
if(!(Test-Path $agentDir)){ New-Item -ItemType Directory -Force -Path $agentDir | Out-Null }

# --- 1) agent.config.json ---
$config = @"
{
  "project": "Cross-AI Voice",
  "agent_name": "CrossAI",
  "env": {
    "mode": "auto", 
    "dev_host_match": ["localhost","127.0.0.1"]
  },
  "agent": {
    "dev":  { "base": "http://127.0.0.1:5600" },
    "prod": { "base": "https://agent.your-domain.tld" }
  },
  "tts": {
    "voice": "en-NG-EzinneNeural",
    "dev":  { "base": "http://127.0.0.1:5500" },
    "prod": { "base": "https://tts.your-domain.tld" }
  },
  "ui": { "theme": "naija-green" }
}
"@
$configPath = Join-Path $public 'agent.config.json'
$config | Set-Content -Encoding UTF8 $configPath

# --- 2) Floating mic widget (complete) ---
$widgetJs = @"
(function(){
  const STATE = { cfg:null, listening:false, recog:null, audio:null };

  async function loadConfig(){
    const res = await fetch('/agent.config.json', {cache:'no-store'});
    STATE.cfg = await res.json();
    // resolve env (auto)
    const host = location.hostname;
    const inDev = (STATE.cfg.env?.mode==='dev') || (STATE.cfg.env?.mode==='auto' && (host==='localhost' || host==='127.0.0.1'));
    STATE.agentBase = inDev ? STATE.cfg.agent.dev.base : STATE.cfg.agent.prod.base;
    STATE.ttsBase   = inDev ? STATE.cfg.tts.dev.base   : STATE.cfg.tts.prod.base;
    STATE.voice     = STATE.cfg.tts.voice || 'en-NG-EzinneNeural';
  }

  function toast(msg){
    let t = document.getElementById('pronto-toast');
    if(!t){ t = document.createElement('div'); t.id='pronto-toast';
      t.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:92px;background:#111;color:#fff;padding:8px 12px;border-radius:6px;font:14px system-ui;z-index:2147483000;opacity:.95'; 
      document.body.appendChild(t);
    }
    t.textContent = msg; clearTimeout(t._h); t.style.display='block';
    t._h = setTimeout(()=>{ t.style.display='none' }, 2500);
  }

  function ensureBtn(){
    if(document.getElementById('pronto-voice-btn')) return;
    const b = document.createElement('button');
    b.id='pronto-voice-btn';
    b.title='Talk to Cross-AI';
    b.textContent='🎤';
    b.style.cssText='position:fixed;right:22px;bottom:22px;width:56px;height:56px;border-radius:50%;border:none;background:#0a7d32;color:#fff;font-size:26px;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer;z-index:2147483000';
    b.onclick = toggleListen;
    document.body.appendChild(b);
  }

  function btnLive(on){
    const b = document.getElementById('pronto-voice-btn');
    if(!b) return; 
    if(on){ b.style.background='#c1121f'; b.textContent='🛑'; b.title='Listening… click to stop'; }
    else  { b.style.background='#0a7d32'; b.textContent='🎤'; b.title='Talk to Cross-AI'; }
  }

  function getRecognizer(){
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) return null;
    if(STATE.recog) return STATE.recog;
    const r = new SR();
    r.lang='en-NG';
    r.interimResults=false; r.maxAlternatives=1;
    r.onstart=()=>{ STATE.listening=true; btnLive(true); toast('🎙️ listening…') };
    r.onerror=(e)=>{ console.warn('[voice] stt error', e); STATE.listening=false; btnLive(false); toast('❌ mic error');};
    r.onend=()=>{ STATE.listening=false; btnLive(false) };
    r.onresult=async(ev)=>{
      const text = ev.results?.[0]?.[0]?.transcript || '';
      if(!text){ toast('😕 say that again?'); return; }
      toast('✅ '+text);
      const reply = await askAgent(text);
      await speak(reply || ('You said: '+text));
    };
    STATE.recog = r; return r;
  }

  async function askAgent(text){
    try{
      const r = await fetch(STATE.agentBase+'/reply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
      if(!r.ok) throw new Error('agent '+r.status);
      const j = await r.json();
      return j?.text || j?.reply || '';
    }catch(e){
      console.warn('[voice] agent error', e);
      return 'You said: '+text;
    }
  }

  async function speak(text){
    if(!text) return;
    // If page is HTTPS and ttsBase is HTTP, browsers will block it.
    // In that case, try agent proxy: GET {agentBase}/tts?text=... (server returns audio with CORS)
    const httpsPage = location.protocol === 'https:';
    const ttsIsHttps = /^https:/i.test(STATE.ttsBase);
    let url, useAgentProxy=false;

    if(httpsPage && !ttsIsHttps){
      useAgentProxy = true;
    }

    if(useAgentProxy){
      url = STATE.agentBase + '/tts?mode=file&voice='+encodeURIComponent(STATE.voice)+'&text='+encodeURIComponent(text);
    }else{
      url = STATE.ttsBase + '/speak?mode=file&voice='+encodeURIComponent(STATE.voice)+'&text='+encodeURIComponent(text);
    }

    try{
      const r = await fetch(url, {cache:'no-store'});
      if(!r.ok) throw new Error('tts '+r.status);
      const blob = await r.blob();
      const src = URL.createObjectURL(blob);
      if(!STATE.audio){
        STATE.audio = new Audio();
        STATE.audio.preload = 'auto';
      }
      STATE.audio.src = src;
      await STATE.audio.play();
    }catch(e){
      console.warn('[voice] tts error', e);
      toast('🔇 TTS not reachable');
    }
  }

  function toggleListen(){
    const r = getRecognizer();
    if(!r){
      const fallback = prompt('Mic not supported. Type a message for Cross-AI:','Hello Lagos!');
      if(fallback) askAgent(fallback).then(ans=> speak(ans || ('You said: '+fallback)));
      return;
    }
    try{ STATE.listening ? r.stop() : r.start() }catch(e){ console.warn('[voice] toggle', e) }
  }

  (async function boot(){
    try{ await loadConfig(); ensureBtn(); }catch(e){ console.warn('[voice] boot', e) }
  })();
})();
"@
$widgetPath = Join-Path $public 'pronto-voice-widget.js'
$widgetJs | Set-Content -Encoding UTF8 $widgetPath

# --- 3) Agent proxy: add /tts passthrough (complete server.py) ---
$agentServer = @"
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
    # Minimal safe completion (server-side) – replace with your preferred OpenAI call
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
"@
$agentSrvPath = Join-Path $agentDir 'server.py'
$agentServer | Set-Content -Encoding UTF8 $agentSrvPath

# --- 4) Start local services (if present) ---
function Start-If-Down($name, $health, $command, $cwd){
  try { $ok = (Invoke-RestMethod -Uri $health -TimeoutSec 4) -ne $null } catch { $ok = $false }
  if(-not $ok){
    Write-Host "Starting $name..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoLogo -NoProfile -ExecutionPolicy Bypass -Command `"Set-Location `"$cwd`"; $command`""
    Start-Sleep -Seconds 2
  }
}

# TTS
if(Test-Path (Join-Path $ttsDir 'start-tts.ps1')){
  Start-If-Down 'ODIA TTS' 'http://127.0.0.1:5500/health' '. .\.venv\Scripts\Activate.ps1; python -m uvicorn server:app --host 127.0.0.1 --port 5500' $ttsDir
}

# Agent
$agentStart = Join-Path $agentDir 'start-agent-proxy.ps1'
if(!(Test-Path $agentStart)){
  @"
`$ErrorActionPreference='Stop'
Set-Location `"$PSScriptRoot`"
if(-not (Test-Path .venv)) { py -3 -m venv .venv }
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip >`$null
pip install fastapi uvicorn httpx requests >`$null
if(Test-Path .env){ Write-Host 'Using .env' }
python -m uvicorn server:app --host 127.0.0.1 --port 5600
"@ | Set-Content -Encoding UTF8 $agentStart
}
Start-If-Down 'Agent Proxy' 'http://127.0.0.1:5600/health' '. .\.venv\Scripts\Activate.ps1; python -m uvicorn server:app --host 127.0.0.1 --port 5600' $agentDir

# --- 5) Print quick-tests ---
Write-Host "`n=== QUICK TESTS ===" -ForegroundColor Yellow
Write-Host "TTS health :  " -NoNewline
try{ $h1 = Invoke-RestMethod http://127.0.0.1:5500/health -TimeoutSec 4; Write-Host "OK" -ForegroundColor Green } catch { Write-Host "DOWN" -ForegroundColor Red }
Write-Host "Agent health: " -NoNewline
try{ $h2 = Invoke-RestMethod http://127.0.0.1:5600/health -TimeoutSec 4; Write-Host "OK" -ForegroundColor Green } catch { Write-Host "DOWN" -ForegroundColor Red }

# File-mode fetch via proxy (HTTPS-safe path)
$mp3 = Join-Path $env:TEMP 'crossai_test.mp3'
try{
  Invoke-WebRequest "http://127.0.0.1:5600/tts?mode=file&voice=en-NG-EzinneNeural&text=How%20far%20na%2C%20Cross%20AI%20don%20ready" -OutFile $mp3 -TimeoutSec 20 -UseBasicParsing
  if((Test-Path $mp3) -and ((Get-Item $mp3).Length -gt 1500)){
    Write-Host "Audio OK -> $mp3" -ForegroundColor Green
  } else {
    Write-Host "Audio test failed" -ForegroundColor Red
  }
}catch{ Write-Host "Audio test failed ($_)" -ForegroundColor Red }

Write-Host "`nDone. On the website, click the green 🎤 to talk; audio returns over agent /tts proxy (HTTPS-safe)." -ForegroundColor Green
