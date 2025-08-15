export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST');
    return res.status(405).json({ ok:false, error:'method_not_allowed' });
  }

  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return res.status(500).json({ ok:false, error:'missing_OPENAI_API_KEY' });

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body||'{}'); } catch {} }
    const text = (body?.text || body?.prompt || '').toString();
    if (!text.trim()) return res.status(400).json({ ok:false, error:'empty_text' });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{
        'Authorization': Bearer ,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role:'system', content:'You are Lexi, a warm Nigerian AI assistant. Keep replies brief and friendly.' },
          { role:'user',   content:text }
        ],
        temperature: 0.6
      })
    });

    if (!r.ok) {
      const err = await r.text().catch(()=> '');
      return res.status(502).json({ ok:false, error:'openai_error', detail: err });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || 'I dey here. How far?';
    return res.status(200).json({ ok:true, text: reply });
  } catch (e) {
    return res.status(500).json({ ok:false, error: (e?.message || 'agent_failed') });
  }
}
