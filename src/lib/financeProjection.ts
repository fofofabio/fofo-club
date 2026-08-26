import type { FinanceTransaction } from "@/lib/workspaceFinance";

export type IncomeProjection = {
  merchant: string;
  amountCents: number;
  expectedStartDay: number;
  expectedEndDay: number;
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function monthDistance(from: string, to: string) {
  const [fromYear, fromMonth] = from.split("-").map(Number);
  const [toYear, toMonth] = to.split("-").map(Number);
  return (toYear - fromYear) * 12 + toMonth - fromMonth;
}

export function inferCurrentMonthIncome(
  transactions: FinanceTransaction[],
  currentMonth: string,
): IncomeProjection | null {
  if (!currentMonth) return null;

  const byMerchant = new Map<string, FinanceTransaction[]>();
  for (const transaction of transactions) {
    if (transaction.amountCents <= 0 || transaction.category !== "Income") continue;
    const items = byMerchant.get(transaction.merchant) ?? [];
    items.push(transaction);
    byMerchant.set(transaction.merchant, items);
  }

  const candidates = [...byMerchant.entries()].flatMap(([merchant, items]) => {
    if (items.some((item) => item.bookedOn.startsWith(currentMonth))) return [];

    const lateMonthItems = items
      .filter((item) => Number(item.bookedOn.slice(8, 10)) >= 24)
      .sort((a, b) => a.bookedOn.localeCompare(b.bookedOn));
    const months = new Set(lateMonthItems.map((item) => item.bookedOn.slice(0, 7)));
    if (months.size < 4) return [];

    const lastSeenMonth = lateMonthItems.at(-1)?.bookedOn.slice(0, 7) ?? "";
    if (!lastSeenMonth || monthDistance(lastSeenMonth, currentMonth) > 2) return [];

    const recent = lateMonthItems.slice(-12);
    const amountCents = median(recent.map((item) => item.amountCents));
    return [{
      merchant,
      amountCents,
      expectedStartDay: 26,
      expectedEndDay: 29,
      score: months.size * amountCents,
    }];
  });

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  if (!best) return null;
  return {
    merchant: best.merchant,
    amountCents: best.amountCents,
    expectedStartDay: best.expectedStartDay,
    expectedEndDay: best.expectedEndDay,
  };
}
