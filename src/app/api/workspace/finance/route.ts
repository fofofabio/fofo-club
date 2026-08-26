import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { listWorkspaceFinance } from "@/lib/workspaceFinance";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await listWorkspaceFinance(userId));
}
