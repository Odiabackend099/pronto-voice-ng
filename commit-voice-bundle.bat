\
    @echo off
    rem Run this from your repo root
    git add pages\api\reply.ts pages\api\tts.ts public\agent.config.json public\pronto-voice-widget.js public\voice.html pages\_document.tsx README-VOICE.md
    git commit -m "Voice: add widget, agent route, and TTS proxy"
    git push
