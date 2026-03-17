const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { driverLocation, customerLocation, destination, units } = await req.json();

    if (!driverLocation || !customerLocation || !destination) {
      return new Response(
        JSON.stringify({ error: 'driverLocation, customerLocation, and destination are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    console.log('API Key exists:', !!apiKey, 'Length:', apiKey?.length || 0, 'Starts with:', apiKey?.substring(0, 8));
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const unitSystem = units === 'imperial' ? 'imperial' : 'metric';

    // Two parallel Distance Matrix calls:
    // D1: Driver → Customer
    // D2: Customer → Destination
    const [d1Response, d2Response] = await Promise.all([
      fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(driverLocation)}&destinations=${encodeURIComponent(customerLocation)}&units=${unitSystem}&key=${apiKey}`),
      fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(customerLocation)}&destinations=${encodeURIComponent(destination)}&units=${unitSystem}&key=${apiKey}`),
    ]);

    const [d1Data, d2Data] = await Promise.all([d1Response.json(), d2Response.json()]);

    // Validate D1
    if (d1Data.status !== 'OK') {
      return new Response(
        JSON.stringify({ error: 'Distance Matrix API error (D1)', details: d1Data.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const d1Element = d1Data.rows?.[0]?.elements?.[0];
    if (!d1Element || d1Element.status !== 'OK') {
      return new Response(
        JSON.stringify({ error: 'No route found (Driver → Customer)', details: d1Element?.status }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate D2
    if (d2Data.status !== 'OK') {
      return new Response(
        JSON.stringify({ error: 'Distance Matrix API error (D2)', details: d2Data.status }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const d2Element = d2Data.rows?.[0]?.elements?.[0];
    if (!d2Element || d2Element.status !== 'OK') {
      return new Response(
        JSON.stringify({ error: 'No route found (Customer → Destination)', details: d2Element?.status }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        d1: {
          text: d1Element.distance.text,
          meters: d1Element.distance.value,
          km: d1Element.distance.value / 1000,
          durationText: d1Element.duration.text,
          durationMinutes: Math.round(d1Element.duration.value / 60),
        },
        d2: {
          text: d2Element.distance.text,
          meters: d2Element.distance.value,
          km: d2Element.distance.value / 1000,
          durationText: d2Element.duration.text,
          durationMinutes: Math.round(d2Element.duration.value / 60),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
