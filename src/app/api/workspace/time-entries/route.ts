import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { badRequest, invalidTimeEntry, readBody } from "@/lib/workspaceInput";
import {
  createWorkspaceTimeEntry,
  getWorkspaceActiveSession,
  listWorkspaceTimeEntries,
} from "@/lib/workspaceTimeEntries";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorized();
  }

  const [entries, activeSession] = await Promise.all([
    listWorkspaceTimeEntries(userId),
    getWorkspaceActiveSession(userId),
  ]);

  return NextResponse.json({ entries, activeSession });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorized();
  }

  const raw = await readBody(request);
  if (!raw) return badRequest("Send the entry as a JSON object.");
  const invalid = invalidTimeEntry(raw);
  if (invalid) return badRequest(invalid);
  const body = raw as {
    project?: string;
    task?: string;
    date?: string;
    start?: string;
    end?: string;
  };

  const project = body.project?.trim() ?? "";
  const task = body.task?.trim() ?? "";
  const date = body.date ?? "";
  const start = body.start ?? "";
  const end = body.end ?? "";

  if (!project || !date || !start || !end || end <= start) {
    return NextResponse.json({ error: "Invalid time entry payload." }, { status: 400 });
  }

  const entry = await createWorkspaceTimeEntry(userId, {
    project,
    task,
    date,
    start,
    end,
  });

  return NextResponse.json({ entry });
}
