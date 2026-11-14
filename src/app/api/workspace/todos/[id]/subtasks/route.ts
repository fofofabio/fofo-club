import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { createWorkspaceTodoSubtask } from "@/lib/workspaceTodoSubtasks";
import { badRequest, invalidTaskField, isUuid, readBody } from "@/lib/workspaceInput";

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
  if (!isUuid(id)) return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  const raw = await readBody(request);
  if (!raw) return badRequest("Send the subtask as a JSON object.");
  const invalid = invalidTaskField({ text: raw.text });
  if (invalid) return badRequest(invalid);
  const body = raw as { text?: string };
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
