import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { deleteDriftRun } from "@/lib/driftRuns";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The board itself is open to anyone with the link, but pulling a row back off
// it needs a workspace login. That is the janitor key for junk entries.
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteDriftRun(id);

  return NextResponse.json({ ok: true });
}
