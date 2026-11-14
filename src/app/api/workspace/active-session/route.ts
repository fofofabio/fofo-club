import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { badRequest, isTimeZone, readBody } from "@/lib/workspaceInput";
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

  const raw = await readBody(request);
  if (!raw) return badRequest("Send the timer as a JSON object.");
  for (const [key, max] of [["project", 200], ["task", 1000], ["timezone", 64]] as const) {
    const value = raw[key];
    if (value !== undefined && (typeof value !== "string" || value.length > max)) return badRequest(`${key} must be text of at most ${max} characters.`);
  }
  if (typeof raw.timezone === "string" && raw.timezone.trim() && !isTimeZone(raw.timezone.trim())) return badRequest("Unknown time zone.");
  const body = raw as {
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
