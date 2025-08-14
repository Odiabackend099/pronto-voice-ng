@echo on
setlocal enabledelayedexpansion
title Cross-AI Voice: create public files (verbose)

REM repo root = the folder where this BAT lives
set "ROOT=%~dp0"
set "PUB=%ROOT%public"
set "PS1=%TEMP%\make_crossai_voice_verbose.ps1"
set "LOG=%TEMP%\make_crossai_voice_verbose.log"

echo.
echo ==== Writing files to: %PUB% ====
if not exist "%PUB%" mkdir "%PUB%"

REM --- Write agent.config.json ---
> "%PUB%\agent.config.json" (
  echo {
  echo   "agent": { "url": "http://127.0.0.1:5600/reply", "timeoutMs": 15000 },
  echo   "tts":   { "speakUrl": "http://127.0.0.1:5500/speak", "voice": "en-NG-EzinneNeural", "rate": "0", "volume": "0" },
  echo   "stt":   { "language": "en-NG" },
  echo   "ui":    { "bottom": "20px", "right": "20px" }
  echo }
)

REM --- Write pronto-voice-widget.js ---
> "%PUB%\pronto-voice-widget.js" (
  echo /* Cross-AI Voice Widget: STT -> Agent -> ODIA TTS */
  echo (()=>{const S={config:null,listening:false,recog:null};
  echo async function a(){try{const e=await fetch("/agent.config.json",{cache:"no-store"});S.config=await e.json()}catch(e){console.warn("[Voice] config load failed",e),S.config={agent:{url:"http://127.0.0.1:5600/reply",timeoutMs:15000},tts:{speakUrl:"http://127.0.0.1:5500/speak",voice:"en-NG-EzinneNeural",rate:"0",volume:"0"},stt:{language:"en-NG"},ui:{bottom:"20px",right:"20px"}}}}
  echo function t(e){let o=document.getElementById("pronto-voice-toast");o||(o=document.createElement("div"),o.id="pronto-voice-toast",o.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:80px;background:#111;color:#fff;padding:8px 12px;border-radius:8px;font:14px system-ui;z-index:999999;opacity:.95;",document.body.appendChild(o)),o.textContent=e,clearTimeout(o._h),o.style.display="block",o._h=setTimeout(()=>o.style.display="none",2500)}
  echo async function n(e){const o=S.config?.agent?.url;if(!o)return null;try{const i=new AbortController,c=setTimeout(()=>i.abort(),S.config.agent.timeoutMs||15000),r=await fetch(o,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:e}),signal:i.signal});clearTimeout(c);if(!r.ok)return null;const l=await r.json().catch(()=>({}));return"string"==typeof l?l:l.reply||l.text||null}catch(i){return console.warn("[Voice] agent error",i),null}}
  echo async function s(e){const o=S.config?.tts||{},i=o.speakUrl||"http://127.0.0.1:5500/speak",c=new URLSearchParams({mode:"file",text:e,voice:o.voice||"en-NG-EzinneNeural",rate:String(null!=o.rate?o.rate:"0"),volume:String(null!=o.volume?o.volume:"0")});try{const r=await fetch(`${i}?${c.toString()}`);if(!r.ok)throw new Error("tts not ok");const l=await r.blob(),d=URL.createObjectURL(l),u=new Audio(d);u.play().catch(()=>{}),u.onended=()=>URL.revokeObjectURL(d)}catch(r){console.warn("[Voice] tts error",r),t("❌ TTS not reachable")}}
  echo function o(){if(document.getElementById("pronto-voice-btn"))return;const e=document.createElement("button");e.id="pronto-voice-btn",e.textContent="🎤",e.title="Talk to Cross-AI",e.style.cssText=`position:fixed;bottom:${S.config?.ui?.bottom||"20px"};right:${S.config?.ui?.right||"20px"};width:56px;height:56px;border:none;border-radius:50%;background:#22c55e;color:#fff;font-size:24px;cursor:pointer;box-shadow:0 10px 20px rgba(0,0,0,.25);z-index:999999;`,e.onclick=i,document.body.appendChild(e)}
  echo function l(e){const o=document.getElementById("pronto-voice-btn");o&&(o.style.background=e?"#ef4444":"#22c55e",o.textContent=e?"🛑":"🎤",o.title=e?"Listening… click to stop":"Talk to Cross-AI")}
  echo function d(){const e=window.SpeechRecognition||window.webkitSpeechRecognition;if(!e)return null;if(S.recog)return S.recog;const o=new e;o.lang=S.config?.stt?.language||"en-NG",o.interimResults=!1,o.maxAlternatives=1,o.onstart=()=>{S.listening=!0,l(!0),t("🎙️ Listening…")},o.onerror=()=>{S.listening=!1,l(!1),t("❌ Mic error")},o.onend=()=>{S.listening=!1,l(!1)},o.onresult=async i=>{const c=i.results?.[0]?.[0]?.transcript||"";if(!c){t("😕 no speech");return}t("✅ "+c);let r=await n(c);r||(r="You said: "+c),await s(r)},S.recog=o;return o}
  echo function i(){const e=d();if(!e){const o=prompt("Mic not supported. Type a message:","Hello Lagos!");o&&n(o).then(c=>s(c||"You said: "+o));return}try{S.listening?e.stop():e.start()}catch{}}
  echo (async function(){try{await a(),o()}catch(e){console.warn("[Voice] boot error",e)}})();})();
)
echo Wrote: %PUB%\pronto-voice-widget.js

REM --- Write voice.html ---
> "%PUB%\voice.html" (
  echo ^<!doctype html^>
  echo ^<html lang="en"^>
  echo   ^<head^>
  echo     ^<meta charset="utf-8"/^>
  echo     ^<title^>Cross-AI Voice Test^</title^>
  echo     ^<meta name="viewport" content="width=device-width, initial-scale=1"/^>
  echo     ^<script defer src="/pronto-voice-widget.js"^>^</script^>
  echo     ^<style^>body{font:16px system-ui;margin:24px}.hint{opacity:.7}^</style^>
  echo   ^</head^>
  echo   ^<body^>
  echo     ^<h1^>Cross-AI Voice Test^</h1^>
  echo     ^<p class="hint"^>Click the green 🎤 button (bottom-right), say something; you'll hear a reply via ODIA TTS.^</p^>
  echo   ^</body^>
  echo ^</html^>
)
echo Wrote: %PUB%\voice.html

REM --- Optional git add/commit/push if repo detected ---
if exist "%ROOT%\.git" (
  echo.
  echo Staging and committing...
  git -C "%ROOT%" add "public\agent.config.json" "public\pronto-voice-widget.js" "public\voice.html"
  git -C "%ROOT%" commit -m "Add Cross-AI voice widget + config"
  git -C "%ROOT%" push
)

echo.
echo ✅ All done. Files are saved in: %PUB%
echo    Test locally at: http://localhost:3000/voice.html  (or your dev port)
echo.
pause
