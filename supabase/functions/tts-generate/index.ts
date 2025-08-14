import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Nigerian voice mapping for ODIA TTS
const VOICE_MAPPING: Record<string, string> = {
  'djTpf4uIoIkiTgl4S93N': 'en-NG-EzinneNeural', // ElevenLabs Aria -> Nigerian Ezinne
  'EXAVITQu4vr4xnSDxMaL': 'en-NG-EzinneNeural', // ElevenLabs Sarah -> Nigerian Ezinne  
  'nigerian_female': 'en-NG-EzinneNeural',
  'nigerian_male': 'en-NG-AbeoNeural',
  'yoruba_female': 'yo-NG-AdunniNeural',
  'igbo_female': 'ig-NG-EbelechukwuNeural',
  'hausa_female': 'ha-NG-SalmaNeural',
  'default': 'en-NG-EzinneNeural'
};

const ODIA_TTS_SERVER = 'https://odia-tts.onrender.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, voice_id, voice } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    console.log('Generating ODIA TTS for text:', text.substring(0, 100), { voice_id, voice });

    // Map voice_id to ODIA TTS voice or use direct voice parameter
    const odiaVoice = voice || VOICE_MAPPING[voice_id] || VOICE_MAPPING.default;

    // Build query parameters for ODIA TTS
    const params = new URLSearchParams({
      text: text,
      voice: odiaVoice,
      rate: '+0%',
      volume: '+0%'
    });

    const odiaUrl = `${ODIA_TTS_SERVER}/speak?${params.toString()}`;
    
    console.log('Calling ODIA TTS:', { url: odiaUrl, voice: odiaVoice });

    const startTime = Date.now();
    const odiaResponse = await fetch(odiaUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    });

    if (!odiaResponse.ok) {
      let errorDetail = '';
      try {
        errorDetail = JSON.stringify(await odiaResponse.json());
      } catch {}
      throw new Error(`ODIA TTS failed: ${odiaResponse.status} ${odiaResponse.statusText} ${errorDetail}`);
    }

    console.log('ODIA TTS successful');
    const audioBuffer = await odiaResponse.arrayBuffer();
    const audioData = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const duration_ms = Date.now() - startTime;

    // Create data URL for the audio
    const audio_url = `data:audio/mpeg;base64,${audioData}`;

    const response = {
      audio_url,
      provider: 'odia-tts',
      voice_used: odiaVoice,
      duration_ms,
      text_length: text.length,
      server: ODIA_TTS_SERVER
    };

    console.log('TTS generation successful:', { 
      provider: 'odia-tts', 
      voice: odiaVoice,
      duration_ms, 
      text_length: text.length 
    });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('ODIA TTS generation failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        provider: 'odia-tts',
        server: ODIA_TTS_SERVER
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});