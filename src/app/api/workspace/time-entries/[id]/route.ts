import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  deleteWorkspaceTimeEntry,
  updateWorkspaceTimeEntry,
} from "@/lib/workspaceTimeEntries";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorized();
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
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

  const entry = await updateWorkspaceTimeEntry(userId, id, {
    project,
    task,
    date,
    start,
    end,
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  return NextResponse.json({ entry });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorized();
  }

  const { id } = await context.params;
  const deleted = await deleteWorkspaceTimeEntry(userId, id);

  if (!deleted) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
