import { query } from "@/lib/db";
import { displayMerchant } from "@/lib/merchantName";

export const FINANCE_CATEGORIES = [
  "Housing",
  "Utilities",
  "Groceries",
  "Dining",
  "Shopping",
  "Transport",
  "Health",
  "Personal Care",
  "Entertainment",
  "Sports",
  "Travel",
  "Pets",
  "Insurance",
  "Debt",
  "Subscriptions",
  "Cash",
  "Fees",
  "Transfers",
  "Refunds",
  "Income",
  "Other",
] as const;

export type FinanceCategory = (typeof FINANCE_CATEGORIES)[number];
export type SubscriptionStatus = "active" | "paused" | "cancelled";

export type FinanceTransaction = {
  id: string;
  bookedOn: string;
  merchant: string;
  /** The name as the bank exported it, when the display name was shortened. */
  merchantRaw?: string;
  description: string;
  amountCents: number;
  currency: string;
  category: FinanceCategory;
  provider: "bank" | "paypal";
};

export type FinanceSubscription = {
  id: string;
  name: string;
  amountCents: number;
  cadence: string;
  lastChargeOn: string;
  nextChargeOn: string | null;
  status: SubscriptionStatus;
  confidence: "high" | "medium" | "low";
  occurrences: number;
  category: FinanceCategory;
};

export type FinanceMonthlyExpense = {
  id: string;
  name: string;
  amountCents: number;
  category: FinanceCategory;
  dueDay: number | null;
  active: boolean;
  note: string;
};

export type FinancePayload = {
  transactions: FinanceTransaction[];
  subscriptions: FinanceSubscription[];
  monthlyExpenses: FinanceMonthlyExpense[];
  meta: {
    dataStart: string | null;
    dataEnd: string | null;
    transactionCount: number;
  };
};

type FinanceMetaRow = {
  dataStart: string | null;
  dataEnd: string | null;
  transactionCount: number;
};

// Same grouping key as the importer's subscription detection.
function subscriptionKey(merchant: string) {
  return merchant === "Foodora" ? "foodora-pro" : merchant.toLocaleLowerCase("de-AT").replace(/[^a-z0-9]+/g, "-");
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

const STATUS_ORDER: Record<string, number> = { active: 0, paused: 1 };

// The stored amount is fixed at import time. Price each subscription from the median of its
// latest three charges in the ledger instead, so a price rise shows without a re-import and
// a single odd charge does not.
function currentSubscriptionPrices(rows: (FinanceSubscription & { merchantKey: string })[], transactions: FinanceTransaction[]) {
  const recent = new Map<string, number[]>();
  for (const item of transactions) { // newest first
    if (item.category !== "Subscriptions" || item.amountCents >= 0) continue;
    const key = subscriptionKey(item.merchant);
    const amounts = recent.get(key) ?? [];
    if (amounts.length < 3) amounts.push(Math.abs(item.amountCents));
    recent.set(key, amounts);
  }
  return rows
    .map(({ merchantKey, ...row }) => {
      const amounts = recent.get(merchantKey);
      return { ...row, name: displayMerchant(row.name), amountCents: amounts?.length === 3 ? median(amounts) : row.amountCents };
    })
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 2) - (STATUS_ORDER[b.status] ?? 2) || b.amountCents - a.amountCents || a.name.localeCompare(b.name));
}

export async function listWorkspaceFinance(userId: string): Promise<FinancePayload> {
  const [transactions, subscriptions, monthlyExpenses, meta] = await Promise.all([
    query<FinanceTransaction>(
      `
        select
          id,
          booked_on::text as "bookedOn",
          merchant,
          description,
          amount_cents as "amountCents",
          currency,
          category,
          provider
        from workspace_finance_transactions
        where user_id = $1
        order by booked_on desc, created_at desc
      `,
      [userId],
    ),
    query<FinanceSubscription & { merchantKey: string }>(
      `
        select
          id,
          merchant_key as "merchantKey",
          name,
          amount_cents as "amountCents",
          cadence,
          last_charge_on::text as "lastChargeOn",
          next_charge_on::text as "nextChargeOn",
          status,
          confidence,
          occurrences,
          category
        from workspace_finance_subscriptions
        where user_id = $1
        order by
          case status when 'active' then 0 when 'paused' then 1 else 2 end,
          amount_cents desc,
          name asc
      `,
      [userId],
    ),
    query<FinanceMonthlyExpense>(
      `
        select
          id,
          name,
          amount_cents as "amountCents",
          category,
          due_day as "dueDay",
          active,
          note
        from workspace_finance_monthly_expenses
        where user_id = $1
        order by active desc, due_day asc nulls last, amount_cents desc, name asc
      `,
      [userId],
    ),
    query<FinanceMetaRow>(
      `
        select
          min(booked_on)::text as "dataStart",
          max(booked_on)::text as "dataEnd",
          count(*)::int as "transactionCount"
        from workspace_finance_transactions
        where user_id = $1
      `,
      [userId],
    ),
  ]);

  return {
    transactions: transactions.rows.map((row) => {
      const merchant = displayMerchant(row.merchant);
      return merchant === row.merchant ? row : { ...row, merchant, merchantRaw: row.merchant };
    }),
    subscriptions: currentSubscriptionPrices(subscriptions.rows, transactions.rows),
    monthlyExpenses: monthlyExpenses.rows,
    meta: meta.rows[0] ?? { dataStart: null, dataEnd: null, transactionCount: 0 },
  };
}

export async function createFinanceMonthlyExpense(
  userId: string,
  input: Omit<FinanceMonthlyExpense, "id">,
) {
  const result = await query<FinanceMonthlyExpense>(
    `
      insert into workspace_finance_monthly_expenses
        (user_id, name, amount_cents, category, due_day, active, note)
      values ($1,$2,$3,$4,$5,$6,$7)
      returning
        id,
        name,
        amount_cents as "amountCents",
        category,
        due_day as "dueDay",
        active,
        note
    `,
    [userId, input.name, input.amountCents, input.category, input.dueDay, input.active, input.note],
  );
  return result.rows[0];
}

export async function updateFinanceMonthlyExpense(
  userId: string,
  expenseId: string,
  input: Omit<FinanceMonthlyExpense, "id">,
) {
  const result = await query<FinanceMonthlyExpense>(
    `
      update workspace_finance_monthly_expenses
      set
        name = $3,
        amount_cents = $4,
        category = $5,
        due_day = $6,
        active = $7,
        note = $8,
        import_key = null,
        updated_at = now()
      where id = $2 and user_id = $1
      returning
        id,
        name,
        amount_cents as "amountCents",
        category,
        due_day as "dueDay",
        active,
        note
    `,
    [userId, expenseId, input.name, input.amountCents, input.category, input.dueDay, input.active, input.note],
  );
  return result.rows[0] ?? null;
}

export async function deleteFinanceMonthlyExpense(userId: string, expenseId: string) {
  const result = await query<{ id: string }>(
    "delete from workspace_finance_monthly_expenses where id = $2 and user_id = $1 returning id",
    [userId, expenseId],
  );
  return Boolean(result.rowCount);
}

export async function updateFinanceSubscriptionStatus(
  userId: string,
  subscriptionId: string,
  status: SubscriptionStatus,
) {
  const result = await query<FinanceSubscription>(
    `
      update workspace_finance_subscriptions
      set status = $3, updated_at = now()
      where id = $2 and user_id = $1
      returning
        id,
        name,
        amount_cents as "amountCents",
        cadence,
        last_charge_on::text as "lastChargeOn",
        next_charge_on::text as "nextChargeOn",
        status,
        confidence,
        occurrences,
        category
    `,
    [userId, subscriptionId, status],
  );
  const row = result.rows[0];
  return row ? { ...row, name: displayMerchant(row.name) } : null;
}
