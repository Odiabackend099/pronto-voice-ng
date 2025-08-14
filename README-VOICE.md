# Pronto Voice Bundle (Drop-in)

Files included (place at repo root):
- `pages/api/reply.ts` – Vercel serverless route -> OpenAI (uses `OPENAI_API_KEY`)
- `pages/api/tts.ts`   – Vercel serverless proxy -> your TTS (uses `TTS_BASE_URL` ending with `/speak`)
- `public/agent.config.json` – Widget config
- `public/pronto-voice-widget.js` – Floating mic widget
- `public/voice.html` – Optional test page
- `pages/_document.tsx` – Loads widget globally (Pages Router)

## Vercel Environment Variables
- `OPENAI_API_KEY` = your OpenAI API key
- `TTS_BASE_URL`   = `https://<your-render-app>.onrender.com/speak` (include `/speak`)

## Test (after deploy)
- Open your domain and tap the green mic.
- Or visit `/voice.html` and tap the mic.

## Notes
- No secrets are exposed to the browser.
- If your project uses the App Router, add the script in `app/layout.tsx` instead.
