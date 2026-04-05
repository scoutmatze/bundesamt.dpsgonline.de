import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/distance?from=München&to=Aachen
 * Returns { km, duration, from, to }
 * Requires GOOGLE_MAPS_API_KEY in .env
 */
export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "from and to required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 503 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(from + ", Deutschland")}&destinations=${encodeURIComponent(to + ", Deutschland")}&mode=driving&language=de&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK" || !data.rows?.[0]?.elements?.[0]) {
      return NextResponse.json({ error: "Route nicht gefunden" }, { status: 404 });
    }

    const element = data.rows[0].elements[0];
    if (element.status !== "OK") {
      return NextResponse.json({ error: "Route nicht gefunden" }, { status: 404 });
    }

    const km = Math.round(element.distance.value / 1000);
    const durationMin = Math.round(element.duration.value / 60);

    return NextResponse.json({
      km,
      duration: durationMin,
      from: data.origin_addresses?.[0] || from,
      to: data.destination_addresses?.[0] || to,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Maps API error: " + e.message }, { status: 500 });
  }
}
