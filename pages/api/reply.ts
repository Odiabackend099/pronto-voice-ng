import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: 'Missing OPENAI_API_KEY' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const userText: string = (body.text || body.prompt || '').toString();

    if (!userText.trim()) return res.status(400).json({ ok: false, error: 'Empty text' });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': Bearer , 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Lexi, a warm Nigerian AI assistant. Keep replies brief and friendly.' },
          { role: 'user', content: userText }
        ],
        temperature: 0.6
      })
    });

    if (!r.ok) {
      const err = await r.text().catch(() => '');
      return res.status(502).json({ ok: false, error: 'OpenAI error', detail: err });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || 'I dey here. How far?';
    return res.status(200).json({ ok: true, text });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'agent_failed' });
  }
}
