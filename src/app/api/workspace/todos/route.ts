import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  clearCompletedWorkspaceTodos,
  createWorkspaceTodo,
  listWorkspaceTodos,
  reorderWorkspaceTodos,
} from "@/lib/workspaceTodos";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();

  const todos = await listWorkspaceTodos(userId);

  return NextResponse.json({ todos });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();

  const body = (await request.json()) as {
    text?: string;
    project?: string;
    dueDate?: string;
  };

  const text = body.text?.trim() ?? "";

  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const todo = await createWorkspaceTodo(userId, {
    text,
    project: body.project,
    dueDate: body.dueDate,
  });

  return NextResponse.json({ todo });
}

export async function PUT(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();

  const body = (await request.json()) as { order?: string[] };

  if (!Array.isArray(body.order)) {
    return NextResponse.json({ error: "order array required." }, { status: 400 });
  }

  await reorderWorkspaceTodos(userId, body.order);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();

  await clearCompletedWorkspaceTodos(userId);

  return NextResponse.json({ ok: true });
}
