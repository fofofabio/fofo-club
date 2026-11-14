import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  deleteWorkspaceTodoSubtask,
  updateWorkspaceTodoSubtask,
} from "@/lib/workspaceTodoSubtasks";
import { badRequest, invalidTaskField, isUuid, readBody } from "@/lib/workspaceInput";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; subtaskId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();

  const { id, subtaskId } = await context.params;
  if (!isUuid(id) || !isUuid(subtaskId)) return NextResponse.json({ error: "Subtask not found." }, { status: 404 });
  const raw = await readBody(request);
  if (!raw) return badRequest("Send the changes as a JSON object.");
  const invalid = invalidTaskField({ text: raw.text, done: raw.done });
  if (invalid) return badRequest(invalid);
  const body = raw as { text?: string; done?: boolean };

  const subtask = await updateWorkspaceTodoSubtask(userId, id, subtaskId, {
    text: body.text,
    done: body.done,
  });

  if (!subtask) {
    return NextResponse.json({ error: "Subtask not found." }, { status: 404 });
  }

  return NextResponse.json({ subtask });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; subtaskId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();

  const { id, subtaskId } = await context.params;
  if (!isUuid(id) || !isUuid(subtaskId)) return NextResponse.json({ error: "Subtask not found." }, { status: 404 });
  const deleted = await deleteWorkspaceTodoSubtask(userId, id, subtaskId);

  if (!deleted) {
    return NextResponse.json({ error: "Subtask not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
