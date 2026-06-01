import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createWorkspaceTodo, listWorkspaceTodos } from "@/lib/workspaceTodos";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorized();
  }

  const todos = await listWorkspaceTodos(userId);

  return NextResponse.json({ todos });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return unauthorized();
  }

  const body = (await request.json()) as { text?: string; project?: string };
  const text = body.text?.trim() ?? "";

  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const todo = await createWorkspaceTodo(userId, {
    text,
    project: body.project,
  });

  return NextResponse.json({ todo });
}
