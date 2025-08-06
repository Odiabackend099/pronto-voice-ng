import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMERGENCY_CLASSIFICATION_PROMPT = `You are an emergency classification system for Nigeria. Analyze the given text and classify it into:

1. Emergency Type (choose one):
   - FIRE (fire, burning, smoke)
   - MEDICAL (accident, injury, illness, heart attack)
   - SECURITY (robbery, kidnapping, violence, crime)
   - FLOOD (flooding, water damage)
   - ACCIDENT (vehicle accident, collision)
   - OTHER (other emergencies)

2. Severity Level (choose one):
   - CRITICAL (immediate life threat, multiple casualties)
   - HIGH (serious emergency, potential life threat)
   - MEDIUM (emergency but not immediately life-threatening)
   - LOW (minor emergency, precautionary)

3. Response (brief emergency response in English, max 50 words)

Context: Nigeria emergency situations, consider local languages (Pidgin, Hausa, Yoruba, Igbo).

Return ONLY a JSON object in this exact format:
{
  "emergency_type": "TYPE",
  "severity": "LEVEL", 
  "response": "brief response text"
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transcript, language } = await req.json();
    
    if (!transcript) {
      throw new Error('Transcript is required');
    }

    console.log('Classifying emergency:', transcript);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `${EMERGENCY_CLASSIFICATION_PROMPT}\n\nText to classify: "${transcript}"\nDetected language: ${language || 'en'}`
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${errorText}`);
    }

    const result = await response.json();
    const classificationText = result.content[0].text;
    
    console.log('Raw classification result:', classificationText);

    // Parse the JSON response from Claude
    let classification;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = classificationText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback classification
      classification = {
        emergency_type: 'OTHER',
        severity: 'MEDIUM',
        response: 'Emergency reported. Dispatching appropriate response team.'
      };
    }

    console.log('Final classification:', classification);

    return new Response(
      JSON.stringify(classification),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in classification function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        fallback: {
          emergency_type: 'OTHER',
          severity: 'MEDIUM',
          response: 'Emergency received. Help is on the way.'
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});