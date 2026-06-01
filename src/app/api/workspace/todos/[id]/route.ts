import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { deleteWorkspaceTodo, updateWorkspaceTodo } from "@/lib/workspaceTodos";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();

  const { id } = await context.params;
  const body = (await request.json()) as {
    text?: string;
    project?: string;
    done?: boolean;
    pinned?: boolean;
    dueDate?: string | null;
    notes?: string;
  };

  const todo = await updateWorkspaceTodo(userId, id, {
    text: body.text,
    project: body.project,
    done: body.done,
    pinned: body.pinned,
    ...("dueDate" in body ? { dueDate: body.dueDate } : {}),
    notes: body.notes,
  });

  if (!todo) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }

  return NextResponse.json({ todo });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();

  const { id } = await context.params;
  const deleted = await deleteWorkspaceTodo(userId, id);

  if (!deleted) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
