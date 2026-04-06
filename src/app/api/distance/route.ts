import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/distance?from=München&to=Aachen
 * Uses OSRM (OpenStreetMap) - DSGVO-konform, kostenlos
 */
export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  try {
    // Step 1: Geocode with Nominatim (OSM)
    const geocode = async (q: string) => {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ", Deutschland")}&format=json&limit=1`, {
        headers: { "User-Agent": "DPSG-Reisekosten/1.0" },
      });
      const data = await res.json();
      if (!data.length) return null;
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name };
    };

    const [fromGeo, toGeo] = await Promise.all([geocode(from), geocode(to)]);
    if (!fromGeo || !toGeo) return NextResponse.json({ error: "Adresse nicht gefunden" }, { status: 404 });

    // Step 2: Route with OSRM
    const osrm = await fetch(`https://router.project-osrm.org/route/v1/driving/${fromGeo.lon},${fromGeo.lat};${toGeo.lon},${toGeo.lat}?overview=false`);
    const route = await osrm.json();

    if (route.code !== "Ok" || !route.routes?.length) {
      return NextResponse.json({ error: "Route nicht gefunden" }, { status: 404 });
    }

    const km = Math.round(route.routes[0].distance / 1000);
    const durationMin = Math.round(route.routes[0].duration / 60);

    return NextResponse.json({ km, duration: durationMin, from: fromGeo.display, to: toGeo.display });
  } catch (e: any) {
    return NextResponse.json({ error: "Routing error: " + e.message }, { status: 500 });
  }
}
