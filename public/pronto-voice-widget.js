// Pronto Voice Widget (standalone, no CSS file needed)
// Drops a floating mic button; click to talk. It will:
// 1) Capture your speech (Web Speech API)
// 2) Ask the local Agent (http://127.0.0.1:5600/reply)
// 3) Speak the reply with ODIA TTS (http://127.0.0.1:5500/speak?mode=file)
// Works even if agent is missing (echo fallback); if TTS fails, uses browser speechSynthesis.

(() => {
  const STATE = {
    config: null,
    recog: null,
    listening: false,
    audio: null,
  };

  // ---- tiny UI (inline styles) ----
  const STYLE = `
  #pronto-voice-btn {
    position: fixed; z-index: 2147483000;
    right: 18px; bottom: 18px; width: 56px; height: 56px;
    border-radius: 50%; border: none; cursor: pointer;
    font-size: 26px; line-height: 56px; text-align: center;
    background: #16a34a; color: #fff; box-shadow: 0 6px 18px rgba(0,0,0,.2);
  }
  #pronto-voice-btn.pronto-live { background:#dc2626; }
  #pronto-toast {
    position: fixed; z-index: 2147483001; left: 50%; transform: translateX(-50%);
    bottom: 84px; max-width: 80vw; background:#111; color:#fff;
    padding:10px 14px; border-radius: 10px; font: 14px/1.4 system-ui, sans-serif;
    box-shadow: 0 6px 22px rgba(0,0,0,.35); display:none;
  }
  `;
  function ensureStyle() {
    if (document.getElementById('pronto-voice-style')) return;
    const st = document.createElement('style');
    st.id = 'pronto-voice-style';
    st.textContent = STYLE;
    document.head.appendChild(st);
  }
  function showToast(msg) {
    let t = document.getElementById('pronto-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pronto-toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(t._tmr);
    t._tmr = setTimeout(() => (t.style.display = 'none'), 3000);
  }
  function toggleBtnLive(on) {
    const b = document.getElementById('pronto-voice-btn');
    if (!b) return;
    b.classList.toggle('pronto-live', !!on);
    b.title = on ? 'Listening… click to stop' : 'Pronto Voice — click to talk';
    b.innerHTML = on ? '🛑' : '🎤';
  }
  function ensureButton() {
    if (document.getElementById('pronto-voice-btn')) return;
    const b = document.createElement('button');
    b.id = 'pronto-voice-btn';
    b.type = 'button';
    b.title = 'Pronto Voice — click to talk';
    b.innerHTML = '🎤';
    b.addEventListener('click', toggleListen);
    document.body.appendChild(b);
  }

  // ---- config ----
  async function loadConfig() {
    try {
      const r = await fetch('/agent.config.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      STATE.config = await r.json();
    } catch {
      // safe defaults
      STATE.config = {
        agent: { baseUrl: 'http://127.0.0.1:5600', endpoint: '/reply', timeoutMs: 20000 },
        tts:   { baseUrl: 'http://127.0.0.1:5500', endpoint: '/speak', defaultVoice: 'en-NG-EzinneNeural', rate:'0', volume:'0' },
        stt:   { language: 'en-NG' },
      };
    }
  }

  // ---- Agent + TTS helpers ----
  async function callAgent(userText) {
    const { baseUrl, endpoint, timeoutMs } = STATE.config.agent;
    try {
      const ctl = new AbortController();
      const tmr = setTimeout(() => ctl.abort(), timeoutMs || 20000);
      const r = await fetch(baseUrl + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText }),
        signal: ctl.signal
      });
      clearTimeout(tmr);
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json().catch(() => ({}));
      return j.reply || j.text || j.answer || '';
    } catch (e) {
      console.warn('[ProntoVoice] agent error', e);
      return ''; // let caller decide fallback
    }
  }

  async function speak(text) {
    // Prefer ODIA TTS; if it fails, fall back to browser speechSynthesis.
    try {
      const t = STATE.config.tts;
      const q = new URLSearchParams({
        text,
        voice: t.defaultVoice || 'en-NG-EzinneNeural',
        rate:  t.rate ?? '0',
        volume:t.volume ?? '0',
        mode:  'file' // reliable for browsers
      });
      const url = `${t.baseUrl}${t.endpoint}?${q.toString()}`;
      const r = await fetch(url, { mode: 'cors' });
      if (!r.ok) throw new Error('tts ' + r.status);
      const blob = await r.blob();
      if (!/^audio\//.test(blob.type) && blob.size < 1024) throw new Error('non-audio');
      if (STATE.audio) { try { STATE.audio.pause(); } catch {} }
      const a = new Audio(URL.createObjectURL(blob));
      STATE.audio = a;
      await a.play();
      return true;
    } catch (e) {
      console.warn('[ProntoVoice] tts error; falling back to speechSynthesis', e);
      // fallback: browser TTS
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-NG';
        window.speechSynthesis.speak(u);
        return true;
      } catch {}
    }
    return false;
  }

  // ---- STT (Web Speech API) ----
  function getRecognizer() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    if (STATE.recog) return STATE.recog;
    const r = new SR();
    r.lang = (STATE.config?.stt?.language) || 'en-NG';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onstart  = () => { STATE.listening = true; toggleBtnLive(true); showToast('🎙️ listening…'); };
    r.onerror  = (e) => { console.warn('[ProntoVoice] STT error', e); STATE.listening = false; toggleBtnLive(false); showToast('❌ mic error'); };
    r.onend    = () => { STATE.listening = false; toggleBtnLive(false); };
    r.onresult = async (ev) => {
      const text = ev.results?.[0]?.[0]?.transcript || '';
      if (!text) { showToast('😕 no speech detected'); return; }
      showToast('✅ ' + text);

      // 1) ask agent; 2) fallback to echo
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
      // no STT: prompt fallback
      const txt = prompt('Mic not supported here. Type message:', 'How far?');
      if (txt) callAgent(txt).then(ans => speak(ans || ('You said: ' + txt)));
      return;
    }
    try {
      if (STATE.listening) r.stop();
      else r.start();
    } catch (e) {
      console.warn('[ProntoVoice] toggle error', e);
    }
  }

  // ---- boot ----
  (async function boot() {
    try {
      ensureStyle();
      await loadConfig();
      ensureButton();
      showToast('🎤 Pronto Voice ready');
    } catch (e) {
      console.warn('[ProntoVoice] boot error', e);
    }
  })();
})();
