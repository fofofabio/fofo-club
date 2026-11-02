import { NextResponse } from "next/server";

import { getDriftRunShot } from "@/lib/driftRuns";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shot = await getDriftRunShot(id);

  if (!shot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(shot.data), {
    headers: {
      "Content-Type": shot.mime,
      "Content-Length": String(shot.data.length),
      // Rows are immutable once posted, so the bytes can sit in cache.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
    },
  });
}
