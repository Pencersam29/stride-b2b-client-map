const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const { address, city, provinceState, country } = await req.json();

    const BASE = 'https://nominatim.openstreetmap.org/search';
    const HEADERS = {
      'User-Agent': 'StrideClientMap/1.0 (stride-app)',
      'Accept-Language': 'en',
    };

    const tryQuery = async (q: string) => {
      const params = new URLSearchParams({ q, format: 'json', limit: '1', addressdetails: '1' });
      const res = await fetch(`${BASE}?${params}`, { headers: HEADERS });
      const data = await res.json();
      console.log(`[geocode] query="${q}" results=${data?.length ?? 0}`);
      if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      return null;
    };

    const tryStructured = async (street: string | null) => {
      const params = new URLSearchParams({
        format: 'json',
        limit: '1',
        addressdetails: '1',
        city,
        state: provinceState,
        country,
      });
      if (street) params.set('street', street);
      const res = await fetch(`${BASE}?${params}`, { headers: HEADERS });
      const data = await res.json();
      console.log(`[geocode] structured street="${street}" results=${data?.length ?? 0}`);
      if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      return null;
    };

    let result = null;

    // 1. Full address freeform (most specific)
    if (address) {
      result = await tryQuery(`${address}, ${city}, ${provinceState}, ${country}`);
    }

    // 2. Structured with street
    if (!result && address) {
      result = await tryStructured(address);
    }

    // 3. Street + city only (no province/country noise)
    if (!result && address) {
      result = await tryQuery(`${address}, ${city}`);
    }

    // 4. City + province + country
    if (!result) {
      result = await tryQuery(`${city}, ${provinceState}, ${country}`);
    }

    // 5. Structured city-level
    if (!result) {
      result = await tryStructured(null);
    }

    // 6. City + country only
    if (!result) {
      result = await tryQuery(`${city}, ${country}`);
    }

    // 7. Just the city name as last resort
    if (!result) {
      result = await tryQuery(city);
    }

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Address not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
