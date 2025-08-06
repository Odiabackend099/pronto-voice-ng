import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log('Processing audio for transcription...');

    // Convert base64 audio to binary
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    const blob = new Blob([bytes], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Primary language, but Whisper auto-detects

    // Send to OpenAI Whisper
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    console.log('Transcription result:', result);

    // Detect language based on content patterns
    const text = result.text.toLowerCase();
    let detectedLanguage = 'en';
    let confidence = 0.8;

    // Simple language detection for Nigerian languages
    if (text.includes('watin') || text.includes('dey') || text.includes('no be')) {
      detectedLanguage = 'pcm'; // Pidgin
      confidence = 0.9;
    } else if (text.includes('bawo') || text.includes('ninu') || text.includes('tani')) {
      detectedLanguage = 'yo'; // Yoruba
      confidence = 0.9;
    } else if (text.includes('kedu') || text.includes('ndewo') || text.includes('ka')) {
      detectedLanguage = 'ig'; // Igbo
      confidence = 0.9;
    } else if (text.includes('salama') || text.includes('ina') || text.includes('kai')) {
      detectedLanguage = 'ha'; // Hausa
      confidence = 0.9;
    }

    return new Response(
      JSON.stringify({
        transcript: result.text,
        detected_language: detectedLanguage,
        confidence: confidence
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in STT function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});