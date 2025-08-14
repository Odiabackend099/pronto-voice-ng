(() => {
  const cfgUrl = "/agent.config.json";
  const $ = (sel, root=document) => root.querySelector(sel);

  async function loadJSON(u){const r=await fetch(u,{cache:"no-store"}); if(!r.ok) throw new Error("config"); return r.json()}

  function button() {
    const b = document.createElement("button");
    b.id = "crossai-voice-btn";
    b.textContent = "";
    Object.assign(b.style, {
      position:"fixed", right:"20px", bottom:"24px", width:"56px", height:"56px",
      borderRadius:"50%", border:"none", fontSize:"24px", cursor:"pointer",
      background:"#16a34a", color:"#fff", boxShadow:"0 6px 16px rgba(0,0,0,.25)", zIndex:999999
    });
    b.title = "Hold to speak";
    document.body.appendChild(b);
    return b;
  }

  function supportSTT(){
    return ("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window);
  }

  async function ttsPlay(url){
    const r = await fetch(url);
    const a = await r.arrayBuffer();
    const blob = new Blob([a], {type: r.headers.get("content-type") || "audio/mpeg"});
    const src  = URL.createObjectURL(blob);
    const audio = new Audio(src);
    audio.play().catch(()=>{});
  }

  async function ttsPlayPOST(url, body){
    const r = await fetch(url, {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body)});
    const a = await r.arrayBuffer();
    const blob = new Blob([a], {type: r.headers.get("content-type") || "audio/mpeg"});
    const src  = URL.createObjectURL(blob);
    const audio = new Audio(src);
    audio.play().catch(()=>{});
  }

  function sttOnce() {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang = "en-NG"; rec.interimResults = false; rec.maxAlternatives = 1;
    return new Promise((resolve,reject) => {
      const to = setTimeout(()=>{ try{rec.stop()}catch{}; reject(new Error("timeout"))}, 15000);
      rec.onresult = (e)=>{ clearTimeout(to); resolve(e.results[0][0].transcript.trim()) };
      rec.onerror = (e)=>{ clearTimeout(to); reject(e.error||"stt_error") };
      rec.onend = ()=>{};
      rec.start();
    });
  }

  function buildAgentURL(cfg, p){ return (cfg.agentBase||"") + (cfg.agentPath||"/api/reply") }
  function buildTTSURL(cfg, txt){
    const base = (cfg.agentBase||"") + (cfg.ttsPath||"/api/tts");
    const v = encodeURIComponent(cfg.voice||"en-NG-EzinneNeural");
    const t = encodeURIComponent(txt);
    return `${base}?text=${t}&voice=${v}`;
  }

  async function main(){
    const cfg = await loadJSON(cfgUrl);
    const btn = button();

    if(!supportSTT()){
      btn.title = "Click to test voice (no STT available)";
      btn.onclick = async () => {
        // Just a ping voice
        await ttsPlay(buildTTSURL(cfg, "How far! Voice is live on Cross AI."));
      };
      return;
    }

    let busy = false;
    let down = false, pressTimer = null;

    const start = async () => {
      if(busy) return;
      busy = true; btn.style.background = "#0d7a30";
      try{
        const heard = await sttOnce();
        const replyURL = buildAgentURL(cfg);
        const rr = await fetch(replyURL, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ text: heard })});
        const data = await rr.json();
        const say = (data && (data.text||data.reply||data.message)) || "I hear you.";
        await ttsPlay(buildTTSURL(cfg, say));
      }catch(e){
        // small beep: say error line
        await ttsPlay(buildTTSURL(cfg, "Sorry, speech failed. Please try again."));
      }finally{
        busy = false; btn.style.background = "#16a34a";
      }
    };

    // Hold-to-speak UX (click also works)
    btn.onmousedown = () => { down = true; pressTimer = setTimeout(()=>{ if(down) start(); }, 80); };
    btn.onmouseup   = () => { down = false; clearTimeout(pressTimer); };
    btn.onclick     = () => start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
