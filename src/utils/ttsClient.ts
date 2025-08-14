// src/utils/ttsClient.ts
export type SpeakOptions = {
  server?: string;              // default: your Render url
  text: string;
  voice?: string;               // e.g., "en-NG-EzinneNeural"
  rate?: string;                // e.g., "+0%" or "-20%"
  volume?: string;              // e.g., "+0%" or "-10%"
  signal?: AbortSignal;
};

const DEFAULT_SERVER = "https://odia-tts.onrender.com";

function q(obj: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v != null && v !== "") p.append(k, v);
  });
  return p.toString();
}

/** Fetches MP3 from your TTS API and returns an object URL + blob. */
export async function speak(opts: SpeakOptions) {
  const server = opts.server ?? DEFAULT_SERVER;
  const qs = q({
    text: opts.text,
    voice: opts.voice ?? "en-NG-EzinneNeural",
    rate: opts.rate ?? "+0%",
    volume: opts.volume ?? "+0%",
  });

  const url = `${server}/speak?${qs}`;

  const res = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    signal: opts.signal,
  });

  if (!res.ok) {
    // If server returns JSON error, surface it
    let detail = "";
    try { detail = JSON.stringify(await res.json()); } catch {}
    throw new Error(`TTS failed: ${res.status} ${res.statusText} ${detail}`);
  }

  const blob = await res.blob();             // audio/mpeg
  const objectUrl = URL.createObjectURL(blob);
  return { objectUrl, blob };
}

// Available Nigerian voices for the TTS system
export const NIGERIAN_VOICES = {
  "en-NG-EzinneNeural": "Ezinne (Nigerian English - Female)",
  "en-NG-AbeoNeural": "Abeo (Nigerian English - Male)", 
  "yo-NG-AdunniNeural": "Adunni (Yoruba - Female)",
  "ig-NG-EbelechukwuNeural": "Ebelechukwu (Igbo - Female)",
  "ha-NG-SalmaNeural": "Salma (Hausa - Female)"
} as const;

export type NigerianVoice = keyof typeof NIGERIAN_VOICES;