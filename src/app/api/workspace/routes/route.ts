import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { cyclingRoutes } from "@/lib/cyclingRoutes";
import { listWorkspaceRouteStates } from "@/lib/workspaceRoutes";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const states = await listWorkspaceRouteStates(userId);
  return NextResponse.json({ routes: cyclingRoutes, states, homeLabel: process.env.WORKSPACE_HOME_LABEL ?? "Home · Graz" }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
