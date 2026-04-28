import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  startWorkspaceActiveSession,
  stopWorkspaceActiveSession,
} from "@/lib/workspaceTimeEntries";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorized();
  }

  const body = (await request.json()) as {
    project?: string;
    task?: string;
    timezone?: string;
  };

  const project = body.project?.trim() ?? "";
  const task = body.task?.trim() ?? "";
  const timezone = body.timezone?.trim() || "Europe/Berlin";

  if (!project) {
    return NextResponse.json({ error: "Project is required." }, { status: 400 });
  }

  try {
    const activeSession = await startWorkspaceActiveSession(userId, {
      project,
      task,
      timezone,
    });

    return NextResponse.json({ activeSession });
  } catch (error) {
    if (error instanceof Error && error.message === "ACTIVE_SESSION_EXISTS") {
      return NextResponse.json(
        { error: "An active session already exists." },
        { status: 409 },
      );
    }

    throw error;
  }
}

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorized();
  }

  const stopped = await stopWorkspaceActiveSession(userId);

  if (!stopped) {
    return NextResponse.json({ error: "No active session." }, { status: 404 });
  }

  return NextResponse.json(stopped);
}
