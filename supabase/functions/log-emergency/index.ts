import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      transcript, 
      detected_language, 
      confidence, 
      emergency_type, 
      severity, 
      location_lat, 
      location_lng, 
      location_address,
      audio_url,
      user_id 
    } = await req.json();

    if (!transcript) {
      throw new Error('Transcript is required');
    }

    console.log('Logging emergency call:', { emergency_type, severity, location_lat, location_lng });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Insert emergency call record
    const { data: emergencyCall, error: callError } = await supabase
      .from('emergency_calls')
      .insert({
        user_id: user_id || null,
        transcript,
        detected_language: detected_language || 'en',
        confidence: confidence || 0.0,
        emergency_type,
        severity,
        location_lat,
        location_lng,
        location_address,
        audio_url,
        status: 'pending'
      })
      .select()
      .single();

    if (callError) {
      console.error('Error inserting emergency call:', callError);
      throw callError;
    }

    console.log('Emergency call logged:', emergencyCall.id);

    // Create incident marker for map display
    if (location_lat && location_lng) {
      const { data: marker, error: markerError } = await supabase
        .from('incident_markers')
        .insert({
          emergency_call_id: emergencyCall.id,
          title: `${emergency_type} Emergency`,
          description: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
          category: emergency_type.toLowerCase(),
          severity: severity.toLowerCase(),
          lat: location_lat,
          lng: location_lng,
          address: location_address,
          status: 'active'
        })
        .select()
        .single();

      if (markerError) {
        console.error('Error creating incident marker:', markerError);
      } else {
        console.log('Incident marker created:', marker.id);
        
        // Broadcast real-time update to map
        const channel = supabase.channel('incident-updates');
        await channel.send({
          type: 'broadcast',
          event: 'new_incident',
          payload: marker
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emergency_call_id: emergencyCall.id,
        message: 'Emergency logged successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-emergency function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});