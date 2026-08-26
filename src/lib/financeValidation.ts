import {
  FINANCE_CATEGORIES,
  type FinanceCategory,
  type FinanceMonthlyExpense,
} from "@/lib/workspaceFinance";

export function parseFinanceExpense(
  body: Record<string, unknown>,
): Omit<FinanceMonthlyExpense, "id"> | null {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const amountCents = Number(body.amountCents);
  const category = typeof body.category === "string" ? body.category : "Other";
  const dueDay = body.dueDay === null || body.dueDay === "" ? null : Number(body.dueDay);
  const active = typeof body.active === "boolean" ? body.active : true;
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (
    !name ||
    !Number.isInteger(amountCents) ||
    amountCents < 0 ||
    !FINANCE_CATEGORIES.includes(category as FinanceCategory) ||
    (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31))
  ) {
    return null;
  }
  return { name, amountCents, category: category as FinanceCategory, dueDay, active, note };
}
