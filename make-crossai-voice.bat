@echo off
setlocal enabledelayedexpansion
REM ====== Self-extracting BAT + PowerShell payload ======
set "PS1=%TEMP%\make_crossai_voice.ps1"

REM Find the payload marker line number
for /f "tokens=1 delims=:" %%A in ('findstr /n /c:":#__PAYLOAD__" "%~f0"') do set START=%%A
set /a START+=1

REM Extract everything after the marker to a temp .ps1
more +%START% "%~f0" > "%PS1%"

REM Run the PowerShell payload with repo root as argument
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" "%~dp0"

REM Cleanup
del "%PS1%" >nul 2>&1
echo.
echo ✅ Done. Files created under: %~dp0public
echo    (If your repo is a git repo, changes were staged/committed/pushed.)
exit /b 0

:#__PAYLOAD__
param($root)

# ---------- Resolve paths ----------
if (-not $root) { $root = Split-Path -Parent $MyInvocation.MyCommand.Path }
$pub   = Join-Path $root 'public'
New-Item -ItemType Directory -Force -Path $pub | Out-Null

# ---------- File: public/agent.config.json ----------
$agentJson = @'
{
  "agent": {
    "url": "http://127.0.0.1:5600/reply",
    "timeoutMs": 15000
  },
  "tts": {
    "speakUrl": "http://127.0.0.1:5500/speak",
    "voice": "en-NG-EzinneNeural",
    "rate": "0",
    "volume": "0"
  },
  "stt": {
    "language": "en-NG"
  },
  "ui": {
    "bottom": "20px",
    "right": "20px"
  }
}
'@
Set-Content -Encoding UTF8 -Path (Join-Path $pub 'agent.config.json') -Value $agentJson

# ---------- File: public/pronto-voice-widget.js ----------
$widgetJs = @'
/* Cross-AI Voice Widget: STT -> Agent -> ODIA TTS */
(() => {
  const STATE = { config: null, listening: false, recog: null };

  async function loadConfig() {
    try {
      const r = await fetch('/agent.config.json', { cache: 'no-store' });
      STATE.config = await r.json();
    } catch (e) {
      console.warn('[Voice] config load failed', e);
      STATE.config = {
        agent: { url: 'http://127.0.0.1:5600/reply', timeoutMs: 15000 },
        tts:   { speakUrl: 'http://127.0.0.1:5500/speak', voice: 'en-NG-EzinneNeural', rate: '0', volume: '0' },
        stt:   { language: 'en-NG' },
        ui:    { bottom: '20px', right: '20px' }
      };
    }
  }

  function toast(msg) {
    let t = document.getElementById('pronto-voice-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pronto-voice-toast';
      t.style.cssText = `
        position:fixed; left:50%; transform:translateX(-50%);
        bottom:80px; background:#111; color:#fff; padding:8px 12px;
        border-radius:8px; font:14px system-ui; z-index:999999; opacity:.95;
      `;
      document.body.appendChild(t);
    }
    t.textContent = msg;
    clearTimeout(t._h); t.style.display = 'block';
    t._h = setTimeout(() => (t.style.display = 'none'), 2500);
  }

  async function callAgent(text) {
    const url = STATE.config?.agent?.url;
    if (!url) return null;
    try {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), STATE.config.agent.timeoutMs || 15000);
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ text }),
        signal: ac.signal
      });
      clearTimeout(to);
      if (!r.ok) return null;
      const j = await r.json().catch(() => ({}));
      return (typeof j === 'string') ? j : (j.reply || j.text || null);
    } catch (e) {
      console.warn('[Voice] agent error', e);
      return null;
    }
  }

  async function speak(text) {
    const cfg = STATE.config?.tts || {};
    const base = cfg.speakUrl || 'http://127.0.0.1:5500/speak';
    const q = new URLSearchParams({
      mode: 'file', // non-streaming for maximal compatibility
      text, voice: cfg.voice || 'en-NG-EzinneNeural',
      rate: String(cfg.rate ?? '0'),
      volume: String(cfg.volume ?? '0')
    });
    try {
      const r = await fetch(`${base}?${q.toString()}`);
      if (!r.ok) throw new Error('tts not ok');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.play().catch(()=>{});
      a.onended = () => URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('[Voice] tts error', e);
      toast('❌ TTS not reachable');
    }
  }

  function ensureButton() {
    if (document.getElementById('pronto-voice-btn')) return;
    const b = document.createElement('button');
    b.id = 'pronto-voice-btn';
    b.textContent = '🎤';
    b.title = 'Talk to Cross-AI';
    b.style.cssText = `
      position:fixed; bottom:${STATE.config?.ui?.bottom || '20px'};
      right:${STATE.config?.ui?.right || '20px'};
      width:56px;height:56px;border:none;border-radius:50%;
      background:#22c55e;color:#fff;font-size:24px; cursor:pointer;
      box-shadow:0 10px 20px rgba(0,0,0,.25); z-index:999999;
    `;
    b.onclick = toggleListen;
    document.body.appendChild(b);
  }

  function toggleLive(on) {
    const b = document.getElementById('pronto-voice-btn');
    if (!b) return;
    b.style.background = on ? '#ef4444' : '#22c55e';
    b.textContent = on ? '🛑' : '🎤';
    b.title = on ? 'Listening… click to stop' : 'Talk to Cross-AI';
  }

  function getRecognizer() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    if (STATE.recog) return STATE.recog;
    const r = new SR();
    r.lang = (STATE.config?.stt?.language) || 'en-NG';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onstart  = () => { STATE.listening = true; toggleLive(true); toast('🎙️ Listening…'); };
    r.onerror  = () => { STATE.listening = false; toggleLive(false); toast('❌ Mic error'); };
    r.onend    = () => { STATE.listening = false; toggleLive(false); };
    r.onresult = async (ev) => {
      const text = ev.results?.[0]?.[0]?.transcript || '';
      if (!text) { toast('😕 no speech'); return; }
      toast('✅ ' + text);
      let reply = await callAgent(text);
      if (!reply) reply = 'You said: ' + text;
      await speak(reply);
    };
    STATE.recog = r;
    return r;
  }

  function toggleListen() {
    const r = getRecognizer();
    if (!r) {
      const fallback = prompt('Mic not supported. Type a message:','Hello Lagos!');
      if (fallback) callAgent(fallback).then(ans => speak(ans || ('You said: '+fallback)));
      return;
    }
    try { STATE.listening ? r.stop() : r.start(); } catch {}
  }

  (async function boot(){
    try { await loadConfig(); ensureButton(); }
    catch (e){ console.warn('[Voice] boot error', e); }
  })();
})();
'@
Set-Content -Encoding UTF8 -Path (Join-Path $pub 'pronto-voice-widget.js') -Value $widgetJs

# ---------- File: public/voice.html (manual test page) ----------
$voiceHtml = @'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8"/>
    <title>Cross-AI Voice Test</title>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <script defer src="/pronto-voice-widget.js"></script>
    <style>
      body{font:16px system-ui;margin:24px}
      .hint{opacity:.7}
    </style>
  </head>
  <body>
    <h1>Cross-AI Voice Test</h1>
    <p class="hint">Click the green 🎤 button (bottom-right), say something; you’ll hear a reply via ODIA TTS.</p>
  </body>
</html>
'@
Set-Content -Encoding UTF8 -Path (Join-Path $pub 'voice.html') -Value $voiceHtml

# ---------- Optional: git add/commit/push ----------
if (Test-Path (Join-Path $root '.git')) {
  try {
    git -C $root add "public/agent.config.json" "public/pronto-voice-widget.js" "public/voice.html" 2>$null
    git -C $root commit -m "Add Cross-AI voice widget + config" 2>$null
    git -C $root push 2>$null
  } catch {}
}

Write-Host "Files written to: $pub" -ForegroundColor Green
Write-Host "Test locally at http://localhost:3000/voice.html (or your dev port)." -ForegroundColor Cyan
