(function(){
  'use strict';
  const STATE = { cfg:null, listening:false, audio:null, rec:null };

  function el(tag, attrs={}, children=[]) {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => {
      if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.substring(2), v);
      else e.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  }

  async function loadConfig() {
    try {
      const r = await fetch('/agent.config.json', { cache: 'no-store' });
      if(!r.ok) throw new Error('agent.config.json not found');
      const cfg = await r.json();
      cfg.tts = Object.assign({ baseUrl:'/api/tts', voice:'en-NG-EzinneNeural', mode:'file' }, cfg.tts || {});
      cfg.agent = Object.assign({ baseUrl:'/api/reply' }, cfg.agent || {});
      cfg.ui = Object.assign({ position:'bottom-right', theme:'system' }, cfg.ui || {});
      return cfg;
    } catch (e) {
      console.warn('[ProntoVoice] config load failed:', e);
      return { agent:{ baseUrl:'/api/reply' }, tts:{ baseUrl:'/api/tts', voice:'en-NG-EzinneNeural', mode:'file' }, ui:{ position:'bottom-right', theme:'system' } };
    }
  }

  function addStyles() {
    const css = `
    .pv-wrap{position:fixed;z-index:2147483000;display:flex;gap:8px;align-items:center;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif}
    .pv-wrap.bottom-right{right:18px;bottom:18px}
    .pv-wrap.bottom-left{left:18px;bottom:18px}
    .pv-wrap.top-right{right:18px;top:18px}
    .pv-wrap.top-left{left:18px;top:18px}
    .pv-btn{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 8px 30px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;background:#10b981;color:white;font-weight:700;font-size:22px}
    .pv-btn.listening{background:#ef4444;animation:pv-pulse 1.2s infinite}
    .pv-panel{background:#111;color:#f3f4f6;border-radius:12px;padding:10px 12px;max-width:280px;box-shadow:0 8px 30px rgba(0,0,0,.25)}
    .pv-panel .pv-title{font-size:13px;opacity:.9;margin-bottom:6px}
    .pv-panel .pv-msg{font-size:12px;opacity:.85}
    @keyframes pv-pulse{0%{transform:scale(1)}50%{transform:scale(1.06)}100%{transform:scale(1)}}
    `;
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  }

  function buildUI(cfg){
    addStyles();
    const posClass = { 'bottom-right':'bottom-right', 'bottom-left':'bottom-left', 'top-right':'top-right', 'top-left':'top-left' }[cfg.ui.position] || 'bottom-right';
    const wrap = el('div', { class:'pv-wrap '+posClass, 'data-pronto-voice':'1' });
    const btn = el('button', { class:'pv-btn', title:'Talk to CrossAI' }, '🎤');
    const panel = el('div', { class:'pv-panel' }, [
      el('div', { class:'pv-title' }, cfg.agent?.name || 'CrossAI Voice'),
      el('div', { class:'pv-msg', id:'pv-msg' }, 'Tap mic, speak, and I’ll reply with voice.')
    ]);
    wrap.appendChild(panel);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
    STATE.audio = new Audio();
    return { btn, panel };
  }

  async function sttOnce(){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const t = prompt('Mic unavailable. Type your message:');
      return (t || '').trim();
    }
    return new Promise((resolve) => {
      const rec = new SpeechRecognition();
      STATE.rec = rec;
      rec.lang = 'en-NG';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        const t = e.results?.[0]?.[0]?.transcript || '';
        resolve(t.trim());
      };
      rec.onerror = () => resolve('');
      rec.onend = () => {};
      rec.start();
    });
  }

  async function agentReply(text, cfg){
    const r = await fetch(cfg.agent.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await r.json().catch(()=>({}));
    if(!data?.ok) throw new Error(data?.error || 'agent_failed');
    return (data.text || '').toString();
  }

  async function ttsPlay(text, cfg){
    const url = `${cfg.tts.baseUrl}?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(cfg.tts.voice)}&mode=${encodeURIComponent(cfg.tts.mode||'file')}`;
    const r = await fetch(url, { method: 'GET' });
    if(!r.ok) throw new Error('tts_failed');
    const blob = await r.blob();
    const src = URL.createObjectURL(blob);
    STATE.audio.src = src;
    await STATE.audio.play().catch(()=>{});
    setTimeout(()=>URL.revokeObjectURL(src), 30000);
  }

  function setListening(btn, on){
    STATE.listening = !!on;
    btn.classList.toggle('listening', !!on);
    btn.textContent = on ? '●' : '🎤';
  }

  async function runFlow(btn, cfg){
    try {
      setListening(btn, true);
      const spoken = await sttOnce();
      setListening(btn, false);
      if (!spoken) return;
      const msg = document.getElementById('pv-msg'); if (msg) msg.textContent = '…thinking…';
      const reply = await agentReply(spoken, cfg);
      if (msg) msg.textContent = reply;
      await ttsPlay(reply, cfg);
    } catch (e){
      const msg = document.getElementById('pv-msg'); if (msg) msg.textContent = 'Voice failed. Try again or type.';
      console.warn('[ProntoVoice] flow error', e);
      setListening(btn, false);
    }
  }

  (async function init(){
    try{
      const cfg = await loadConfig(); STATE.cfg = cfg;
      const { btn } = buildUI(cfg);
      btn.addEventListener('click', () => runFlow(btn, cfg));
    }catch(e){
      console.warn('[ProntoVoice] init failed', e);
    }
  })();
})();
