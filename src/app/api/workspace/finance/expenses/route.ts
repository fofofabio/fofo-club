import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { parseFinanceExpense } from "@/lib/financeValidation";
import { createFinanceMonthlyExpense } from "@/lib/workspaceFinance";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = parseFinanceExpense((await request.json()) as Record<string, unknown>);
  if (!input) return NextResponse.json({ error: "Invalid monthly expense." }, { status: 400 });

  const expense = await createFinanceMonthlyExpense(userId, input);
  return NextResponse.json({ expense }, { status: 201 });
}
