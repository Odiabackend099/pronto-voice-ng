import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { text, voice_id } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    console.log('Generating TTS for text:', text);

    const elevenLabsVoiceId = voice_id || Deno.env.get('ELEVENLABS_VOICE_ID') || 'djTpf4uIoIkiTgl4S93N';
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');

    let audioContent = null;
    let durationMs = 0;

    // Try ElevenLabs first
    try {
      console.log('Attempting ElevenLabs TTS...');
      const elevenLabsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.75,
              similarity_boost: 0.85,
              style: 0.5,
              use_speaker_boost: true
            }
          }),
        }
      );

      if (elevenLabsResponse.ok) {
        const arrayBuffer = await elevenLabsResponse.arrayBuffer();
        audioContent = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        // Estimate duration (rough calculation: ~150 words per minute)
        const wordCount = text.split(' ').length;
        durationMs = Math.max(2000, (wordCount / 150) * 60000);
        
        console.log('ElevenLabs TTS successful');
        return new Response(
          JSON.stringify({
            audio_url: `data:audio/mpeg;base64,${audioContent}`,
            duration_ms: durationMs,
            provider: 'elevenlabs'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('ElevenLabs failed, falling back to OpenAI...');
      }
    } catch (error) {
      console.log('ElevenLabs error:', error, 'falling back to OpenAI...');
    }

    // Fallback to OpenAI TTS
    try {
      console.log('Using OpenAI TTS fallback...');
      const openaiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          input: text,
          voice: 'alloy',
          response_format: 'mp3',
        }),
      });

      if (!openaiResponse.ok) {
        const error = await openaiResponse.json();
        throw new Error(error.error?.message || 'Failed to generate speech');
      }

      const arrayBuffer = await openaiResponse.arrayBuffer();
      audioContent = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Estimate duration
      const wordCount = text.split(' ').length;
      durationMs = Math.max(2000, (wordCount / 150) * 60000);

      console.log('OpenAI TTS successful');
      return new Response(
        JSON.stringify({
          audio_url: `data:audio/mpeg;base64,${audioContent}`,
          duration_ms: durationMs,
          provider: 'openai'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      console.error('Both TTS providers failed:', error);
      throw new Error('All TTS providers failed');
    }

  } catch (error) {
    console.error('Error in TTS function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});