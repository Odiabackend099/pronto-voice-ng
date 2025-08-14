import type { NextApiRequest, NextApiResponse } from 'next';
export const config = { api: { responseLimit: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const base = process.env.TTS_BASE_URL; // e.g. https://your-render-app.onrender.com/speak
    if (!base) return res.status(500).json({ ok: false, error: 'Missing TTS_BASE_URL' });

    const idx = req.url?.indexOf('?') ?? -1;
    const qs  = idx >= 0 ? req.url!.substring(idx) : '';
    const url = `${base}${qs}`;

    const fr  = await fetch(url, { method: 'GET' });
    const ct = fr.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'no-store');

    const ab = await fr.arrayBuffer();
    return res.status(fr.ok ? 200 : fr.status).send(Buffer.from(ab));
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'tts_proxy_failed' });
  }
}
