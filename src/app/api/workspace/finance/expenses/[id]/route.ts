import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { isUuid, readBody } from "@/lib/workspaceInput";
import { parseFinanceExpense } from "@/lib/financeValidation";
import { deleteFinanceMonthlyExpense, updateFinanceMonthlyExpense } from "@/lib/workspaceFinance";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = parseFinanceExpense((await readBody(request)) ?? {});
  if (!input) return NextResponse.json({ error: "Invalid monthly expense." }, { status: 400 });

  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  const expense = await updateFinanceMonthlyExpense(userId, id, input);
  if (!expense) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  return NextResponse.json({ expense });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  const deleted = await deleteFinanceMonthlyExpense(userId, id);
  if (!deleted) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
