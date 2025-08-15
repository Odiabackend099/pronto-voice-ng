export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  try {
    const base = process.env.TTS_BASE_URL; // e.g. https://your-render-app.onrender.com/speak
    if (!base) return res.status(500).json({ ok:false, error:'missing_TTS_BASE_URL' });

    const idx = (req.url || '').indexOf('?');
    const qs  = idx >= 0 ? req.url.slice(idx) : '';
    const url = ${base}; // forward voice, text, mode=file etc.

    const fr = await fetch(url);
    const ct = fr.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'no-store');

    const ab = await fr.arrayBuffer();
    return res.status(fr.ok ? 200 : fr.status).send(Buffer.from(ab));
  } catch (e) {
    return res.status(500).json({ ok:false, error: (e?.message || 'tts_proxy_failed') });
  }
}
