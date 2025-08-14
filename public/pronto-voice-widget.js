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
    b.textContent='ðŸŽ¤';
    b.style.cssText='position:fixed;right:22px;bottom:22px;width:56px;height:56px;border-radius:50%;border:none;background:#0a7d32;color:#fff;font-size:26px;box-shadow:0 6px 18px rgba(0,0,0,.25);cursor:pointer;z-index:2147483000';
    b.onclick = toggleListen;
    document.body.appendChild(b);
  }

  function btnLive(on){
    const b = document.getElementById('pronto-voice-btn');
    if(!b) return; 
    if(on){ b.style.background='#c1121f'; b.textContent='ðŸ›‘'; b.title='Listeningâ€¦ click to stop'; }
    else  { b.style.background='#0a7d32'; b.textContent='ðŸŽ¤'; b.title='Talk to Cross-AI'; }
  }

  function getRecognizer(){
    const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) return null;
    if(STATE.recog) return STATE.recog;
    const r = new SR();
    r.lang='en-NG';
    r.interimResults=false; r.maxAlternatives=1;
    r.onstart=()=>{ STATE.listening=true; btnLive(true); toast('ðŸŽ™ï¸ listeningâ€¦') };
    r.onerror=(e)=>{ console.warn('[voice] stt error', e); STATE.listening=false; btnLive(false); toast('âŒ mic error');};
    r.onend=()=>{ STATE.listening=false; btnLive(false) };
    r.onresult=async(ev)=>{
      const text = ev.results?.[0]?.[0]?.transcript || '';
      if(!text){ toast('ðŸ˜• say that again?'); return; }
      toast('âœ… '+text);
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
      toast('ðŸ”‡ TTS not reachable');
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
