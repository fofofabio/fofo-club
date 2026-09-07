import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";

const SUPPORTED_REGION = { minLon: 13, maxLon: 17, minLat: 45, maxLat: 49 };

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bbox = (request.nextUrl.searchParams.get("bbox") ?? "").split(",").map(Number);
  if (bbox.length !== 4 || !bbox.every(Number.isFinite)) return NextResponse.json({ error: "Invalid map bounds" }, { status: 400 });
  const [minLon, minLat, maxLon, maxLat] = bbox;
  if (minLon < SUPPORTED_REGION.minLon || maxLon > SUPPORTED_REGION.maxLon || minLat < SUPPORTED_REGION.minLat || maxLat > SUPPORTED_REGION.maxLat || minLon >= maxLon || minLat >= maxLat) {
    return NextResponse.json({ error: "Map bounds outside the supported region" }, { status: 400 });
  }

  const upstream = new URL("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export");
  upstream.searchParams.set("bbox", bbox.join(","));
  upstream.searchParams.set("bboxSR", "4326");
  upstream.searchParams.set("imageSR", "4326");
  upstream.searchParams.set("size", "800,420");
  upstream.searchParams.set("format", "jpg");
  upstream.searchParams.set("f", "image");
  const response = await fetch(upstream, {
    headers: { "User-Agent": "FofoClubWorkspace/1.0" },
    next: { revalidate: 604_800 },
    signal: AbortSignal.timeout(12_000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (!response.ok || !contentType.startsWith("image/") || declaredSize > 3_000_000) return NextResponse.json({ error: "Satellite map unavailable" }, { status: 502 });
  const image = await response.arrayBuffer();
  if (image.byteLength > 3_000_000) return NextResponse.json({ error: "Satellite map too large" }, { status: 502 });
  return new NextResponse(image, { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=604800" } });
}
