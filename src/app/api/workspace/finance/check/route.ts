import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { query } from "@/lib/db";

// Read-only: tells the Finances export check which booking references are already in the
// ledger and what range the ledger covers. Nothing is written.
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { references?: unknown } | null;
  const references = Array.isArray(body?.references)
    ? body.references.filter((value): value is string => typeof value === "string" && value.length > 0 && value.length <= 200)
    : null;
  if (!references || references.length > 20_000) {
    return NextResponse.json({ error: "Send up to 20,000 booking references." }, { status: 400 });
  }

  const [existing, ledger] = await Promise.all([
    query<{ ref: string }>(
      `select source_reference as ref from workspace_finance_transactions
       where user_id = $1 and source = 'bank' and source_reference = any($2::text[])`,
      [userId, references],
    ),
    query<{ start: string | null; end: string | null; rows: number }>(
      `select min(booked_on)::text as start, max(booked_on)::text as "end", count(*)::int as rows
       from workspace_finance_transactions where user_id = $1 and source = 'bank'`,
      [userId],
    ),
  ]);

  return NextResponse.json({
    existing: existing.rows.map((row) => row.ref),
    ledger: ledger.rows[0] ?? { start: null, end: null, rows: 0 },
  });
}
