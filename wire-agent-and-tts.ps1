$ErrorActionPreference = 'Stop'

# 0) Resolve repo root from current folder
$repo = (Get-Location).Path
Write-Host "Repo: $repo" -ForegroundColor Cyan

# 1) Ensure folders
$apiDir   = Join-Path $repo 'pages\api'
$pubDir   = Join-Path $repo 'public'
New-Item -ItemType Directory -Force -Path $apiDir | Out-Null
New-Item -ItemType Directory -Force -Path $pubDir | Out-Null

# 2) Files we will create/patch
$replyTs  = Join-Path $apiDir 'reply.ts'
$ttsTs    = Join-Path $apiDir 'tts.ts'
$agentCfg = Join-Path $pubDir 'agent.config.json'

# 3) Backup existing
foreach ($f in @($replyTs,$ttsTs,$agentCfg)) {
  if (Test-Path $f) {
    Copy-Item $f "$f.bak" -Force
    Write-Host "Backup: $f -> $f.bak" -ForegroundColor DarkYellow
  }
}

# 4) Write pages/api/reply.ts (Vercel agent)
@"
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
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
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
"@ | Set-Content -Encoding UTF8 $replyTs
Write-Host "Wrote: pages/api/reply.ts" -ForegroundColor Green

# 5) Write pages/api/tts.ts (proxy to Render TTS)
@"
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
"@ | Set-Content -Encoding UTF8 $ttsTs
Write-Host "Wrote: pages/api/tts.ts" -ForegroundColor Green

# 6) Write /public/agent.config.json (widget points to our Vercel routes)
@"
{
  "agent": {
    "name": "CrossAI",
    "baseUrl": "/api/reply"
  },
  "tts": {
    "baseUrl": "/api/tts",
    "voice": "en-NG-EzinneNeural",
    "mode": "file"
  },
  "ui": {
    "position": "bottom-right",
    "theme": "system"
  }
}
"@ | Set-Content -Encoding UTF8 $agentCfg
Write-Host "Wrote: public/agent.config.json" -ForegroundColor Green

# 7) Confirm widget is already wired globally
$docTsx = Join-Path $repo 'pages\_document.tsx'
if (Test-Path $docTsx) {
  $txt = Get-Content -Raw $docTsx
  if ($txt -notmatch 'pronto-voice-widget\.js') {
    Copy-Item $docTsx "$docTsx.bak" -Force
    $patched = $txt -replace '</body>', '        <script src="/pronto-voice-widget.js" defer></script>'+"`r`n      </body>"
    Set-Content -Encoding UTF8 -Path $docTsx -Value $patched
    Write-Host "Patched: pages/_document.tsx (added widget script)" -ForegroundColor Green
  } else {
    Write-Host "Widget script already present in pages/_document.tsx" -ForegroundColor DarkGreen
  }
} else {
  Write-Host "NOTE: pages/_document.tsx not found. (You added it earlier; if not, add the script tag globally.)" -ForegroundColor Yellow
}

# 8) Git add/commit/push
git add -- pages/api/reply.ts pages/api/tts.ts public/agent.config.json 2>$null
git commit -m "Agent on Vercel (/api/reply) + TTS proxy (/api/tts) + widget config" 2>$null
git push

Write-Host "`n✅ Done. Push complete. Configure Vercel env vars, then open your domain and click the green mic." -ForegroundColor Green
