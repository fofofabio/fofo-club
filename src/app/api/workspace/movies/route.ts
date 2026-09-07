import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { fetchGrazProgramme } from "@/lib/nonstopMovies";
import { listWorkspaceMovieStates } from "@/lib/workspaceMovies";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [programme, states] = await Promise.all([
      fetchGrazProgramme(),
      listWorkspaceMovieStates(userId),
    ]);
    return NextResponse.json({ ...programme, states }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Programme unavailable." },
      { status: 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
