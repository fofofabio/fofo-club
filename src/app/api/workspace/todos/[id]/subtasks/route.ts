import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createWorkspaceTodoSubtask } from "@/lib/workspaceTodoSubtasks";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return unauthorized();

  const { id } = await context.params;
  const body = (await request.json()) as { text?: string };
  const text = body.text?.trim() ?? "";

  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const subtask = await createWorkspaceTodoSubtask(userId, id, text);

  if (!subtask) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }

  return NextResponse.json({ subtask });
}
