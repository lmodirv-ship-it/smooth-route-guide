const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Coordinate {
  lat: number;
  lng: number;
}

interface DistanceSegment {
  text: string;
  meters: number;
  km: number;
  durationText: string;
  durationMinutes: number;
}

const AVERAGE_CITY_SPEED_KMH = 28;

function jsonResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseCoordinateInput(value: string): Coordinate | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { lat, lng };
}

function haversineMeters(from: Coordinate, to: Coordinate) {
  const earthRadius = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDiff = toRadians(to.lat - from.lat);
  const lngDiff = toRadians(to.lng - from.lng);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(lngDiff / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

function buildFallbackSegment(distanceMeters: number): DistanceSegment {
  const km = Math.round((distanceMeters / 1000) * 10) / 10;
  const durationMinutes = Math.max(1, Math.round((km / AVERAGE_CITY_SPEED_KMH) * 60));

  return {
    text: `${km.toFixed(1)} km`,
    meters: Math.round(distanceMeters),
    km,
    durationText: `${durationMinutes} دقيقة`,
    durationMinutes,
  };
}

function parseGoogleSegment(data: any): DistanceSegment | null {
  const element = data?.rows?.[0]?.elements?.[0];

  if (
    !element ||
    element.status !== 'OK' ||
    typeof element.distance?.value !== 'number' ||
    typeof element.duration?.value !== 'number'
  ) {
    return null;
  }

  return {
    text: element.distance.text,
    meters: element.distance.value,
    km: Math.round((element.distance.value / 1000) * 10) / 10,
    durationText: element.duration.text,
    durationMinutes: Math.round(element.duration.value / 60),
  };
}

function buildFallbackResponse(driverLocation: string, customerLocation: string, destination: string, reason: string) {
  const driverCoords = parseCoordinateInput(driverLocation);
  const customerCoords = parseCoordinateInput(customerLocation);
  const destinationCoords = parseCoordinateInput(destination);

  if (!driverCoords || !customerCoords || !destinationCoords) {
    return null;
  }

  const d1 = buildFallbackSegment(haversineMeters(driverCoords, customerCoords));
  const d2 = buildFallbackSegment(haversineMeters(customerCoords, destinationCoords));

  return {
    success: true,
    mode: 'fallback',
    warning: 'تم استخدام حساب تقريبي للمسافة لأن خدمة الخرائط الدقيقة غير متاحة حالياً.',
    fallback_reason: reason,
    d1,
    d2,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    const { driverLocation, customerLocation, destination, units } = await req.json();

    console.info(`[distance-matrix][${requestId}] request_received`, JSON.stringify({
      driverLocation,
      customerLocation,
      destination,
      units,
    }));

    if (!driverLocation || !customerLocation || !destination) {
      console.error(`[distance-matrix][${requestId}] missing_input`);
      return jsonResponse({
        success: false,
        error: 'بيانات الرحلة غير مكتملة. يرجى تحديد نقطة الانطلاق والوجهة.',
      });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    console.info(`[distance-matrix][${requestId}] api_key_status`, JSON.stringify({
      exists: !!apiKey,
      length: apiKey?.length ?? 0,
      startsWith: apiKey?.slice(0, 8) ?? null,
    }));

    if (!apiKey) {
      console.error(`[distance-matrix][${requestId}] missing_google_maps_api_key`);
      const fallback = buildFallbackResponse(driverLocation, customerLocation, destination, 'missing_api_key');
      return jsonResponse(
        fallback ?? {
          success: false,
          error: 'تعذر حساب المسافة حالياً. حاول اختيار الوجهة من القائمة أو أعد المحاولة لاحقاً.',
        }
      );
    }

    const unitSystem = units === 'imperial' ? 'imperial' : 'metric';
    const [d1Response, d2Response] = await Promise.all([
      fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(driverLocation)}&destinations=${encodeURIComponent(customerLocation)}&units=${unitSystem}&key=${apiKey}`),
      fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(customerLocation)}&destinations=${encodeURIComponent(destination)}&units=${unitSystem}&key=${apiKey}`),
    ]);

    const [d1Data, d2Data] = await Promise.all([d1Response.json(), d2Response.json()]);
    const d1 = parseGoogleSegment(d1Data);
    const d2 = parseGoogleSegment(d2Data);

    if (d1 && d2 && d1Data?.status === 'OK' && d2Data?.status === 'OK') {
      console.info(`[distance-matrix][${requestId}] google_success`);
      return jsonResponse({ success: true, mode: 'google', d1, d2 });
    }

    console.error(`[distance-matrix][${requestId}] google_failed`, JSON.stringify({
      d1Status: d1Data?.status,
      d2Status: d2Data?.status,
      d1ElementStatus: d1Data?.rows?.[0]?.elements?.[0]?.status ?? null,
      d2ElementStatus: d2Data?.rows?.[0]?.elements?.[0]?.status ?? null,
      d1ErrorMessage: d1Data?.error_message ?? null,
      d2ErrorMessage: d2Data?.error_message ?? null,
    }));

    const fallback = buildFallbackResponse(driverLocation, customerLocation, destination, 'google_request_failed');
    return jsonResponse(
      fallback ?? {
        success: false,
        error: 'تعذر حساب المسافة حالياً. حاول اختيار الوجهة من القائمة أو أعد المحاولة بعد قليل.',
      }
    );
  } catch (error) {
    console.error(`[distance-matrix][${requestId}] unexpected_error`, error);
    return jsonResponse({
      success: false,
      error: 'حدث خطأ غير متوقع أثناء حساب المسافة. حاول مرة أخرى.',
    });
  }
});
