"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Edit3,
  LoaderCircle,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import type {
  FinanceCategory,
  FinanceMonthlyExpense,
  FinancePayload,
  FinanceSubscription,
  FinanceTransaction,
  SubscriptionStatus,
} from "@/lib/workspaceFinance";
import { inferCurrentMonthIncome, type IncomeProjection } from "@/lib/financeProjection";

const RANGE_OPTIONS = [1, 3, 6, 12, 99] as const;
const EXPENSE_CATEGORIES: FinanceCategory[] = [
  "Housing",
  "Utilities",
  "Transport",
  "Health",
  "Personal Care",
  "Sports",
  "Travel",
  "Pets",
  "Insurance",
  "Debt",
  "Subscriptions",
  "Fees",
  "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  Housing: "#0008ff",
  Utilities: "#ff3dbe",
  Groceries: "#f0b900",
  Dining: "#ff6b35",
  Shopping: "#7b61ff",
  Transport: "#008f7a",
  Health: "#e63946",
  "Personal Care": "#d45087",
  Entertainment: "#8338ec",
  Sports: "#00a6a6",
  Travel: "#2d6cdf",
  Pets: "#9c6b30",
  Insurance: "#607d8b",
  Debt: "#c62828",
  Subscriptions: "#0057b8",
  Cash: "#555555",
  Fees: "#8d6e63",
  Transfers: "#777777",
  Refunds: "#2a9d8f",
  Income: "#008f5a",
  Other: "#9b9b9b",
};

type MonthlySummary = {
  month: string;
  income: number;
  spend: number;
  net: number;
};

type ExpenseDraft = {
  name: string;
  amount: string;
  category: FinanceCategory;
  dueDay: string;
  active: boolean;
  note: string;
};

const emptyExpenseDraft: ExpenseDraft = {
  name: "",
  amount: "",
  category: "Housing",
  dueDay: "",
  active: true,
  note: "",
};

function monthKey(date: string) {
  return date.slice(0, 7);
}

function money(cents: number, sign = false) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    signDisplay: sign ? "always" : "auto",
  }).format(cents / 100);
}

function shortMoney(cents: number) {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents >= 100_000 ? 0 : 2,
  }).format(cents / 100);
}

function dateLabel(date: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

function monthLabel(month: string, long = false) {
  return new Intl.DateTimeFormat("en-GB", {
    month: long ? "long" : "short",
    year: long ? "numeric" : "2-digit",
  }).format(new Date(`${month}-15T12:00:00`));
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The finance request failed.");
  return payload;
}

function buildMonthlySummaries(transactions: FinanceTransaction[]): MonthlySummary[] {
  const months = new Map<string, { income: number; outflow: number; refunds: number }>();
  for (const item of transactions) {
    const key = monthKey(item.bookedOn);
    const bucket = months.get(key) ?? { income: 0, outflow: 0, refunds: 0 };
    if (item.category === "Transfers") {
      months.set(key, bucket);
      continue;
    }
    if (item.amountCents < 0) bucket.outflow += Math.abs(item.amountCents);
    else if (item.category === "Refunds") bucket.refunds += item.amountCents;
    else bucket.income += item.amountCents;
    months.set(key, bucket);
  }
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => {
      const spend = Math.max(0, values.outflow - values.refunds);
      return { month, income: values.income, spend, net: values.income - spend };
    });
}

export default function FinanceDashboard() {
  const [payload, setPayload] = useState<FinancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>(6);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showAllSubscriptions, setShowAllSubscriptions] = useState(false);
  const [subscriptionBusy, setSubscriptionBusy] = useState<string | null>(null);
  const [expenseBusy, setExpenseBusy] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(emptyExpenseDraft);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    requestJson<FinancePayload>("/api/workspace/finance")
      .then((result) => {
        if (!cancelled) setPayload(result);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load finances.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allMonthly = useMemo(
    () => buildMonthlySummaries(payload?.transactions ?? []),
    [payload?.transactions],
  );
  const visibleMonthly = useMemo(
    () => (range === 99 ? allMonthly : allMonthly.slice(-range)),
    [allMonthly, range],
  );
  const rangeTransactions = useMemo(() => {
    const visibleMonths = new Set(visibleMonthly.map((item) => item.month));
    return (payload?.transactions ?? []).filter((item) => visibleMonths.has(monthKey(item.bookedOn)));
  }, [payload?.transactions, visibleMonthly]);
  const current = allMonthly.at(-1) ?? { month: "", income: 0, spend: 0, net: 0 };
  const previous = allMonthly.at(-2) ?? null;
  const incomeProjection = useMemo(
    () => inferCurrentMonthIncome(payload?.transactions ?? [], current.month),
    [current.month, payload?.transactions],
  );
  const expectedIncome = current.income + (incomeProjection?.amountCents ?? 0);
  const expectedNet = expectedIncome - current.spend;
  const savingsRate = expectedIncome > 0 ? Math.round((expectedNet / expectedIncome) * 100) : null;
  const activeSubscriptions = (payload?.subscriptions ?? []).filter((item) => item.status === "active");
  const activeExpenses = (payload?.monthlyExpenses ?? []).filter((item) => item.active);
  const subscriptionsCents = activeSubscriptions.reduce((total, item) => total + item.amountCents, 0);
  const expensesCents = activeExpenses.reduce((total, item) => total + item.amountCents, 0);
  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of rangeTransactions) {
      if (item.amountCents >= 0 || item.category === "Transfers") continue;
      totals.set(item.category, (totals.get(item.category) ?? 0) + Math.abs(item.amountCents));
    }
    return [...totals.entries()]
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents);
  }, [rangeTransactions]);

  const transactionCategories = useMemo(
    () => [...new Set(rangeTransactions.map((item) => item.category))].sort(),
    [rangeTransactions],
  );
  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("de-AT");
    return rangeTransactions.filter((item) => {
      const matchesCategory = category === "All" || item.category === category;
      const matchesSearch = !term || `${item.merchant} ${item.description}`.toLocaleLowerCase("de-AT").includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [category, rangeTransactions, search]);
  const shownSubscriptions = (payload?.subscriptions ?? []).filter(
    (item) => showAllSubscriptions || item.status === "active",
  );

  async function setSubscriptionStatus(item: FinanceSubscription, status: SubscriptionStatus) {
    if (!payload || item.status === status) return;
    setSubscriptionBusy(item.id);
    setNotice(null);
    try {
      const result = await requestJson<{ subscription: FinanceSubscription }>(
        `/api/workspace/finance/subscriptions/${item.id}`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );
      setPayload({
        ...payload,
        subscriptions: payload.subscriptions.map((subscription) =>
          subscription.id === item.id ? result.subscription : subscription,
        ),
      });
      setNotice(`${item.name} marked ${status}.`);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Could not update subscription.");
    } finally {
      setSubscriptionBusy(null);
    }
  }

  function openNewExpense() {
    setEditingExpenseId(null);
    setExpenseDraft(emptyExpenseDraft);
    setExpenseFormOpen(true);
    setNotice(null);
  }

  function openEditExpense(item: FinanceMonthlyExpense) {
    setEditingExpenseId(item.id);
    setExpenseDraft({
      name: item.name,
      amount: (item.amountCents / 100).toFixed(2),
      category: item.category,
      dueDay: item.dueDay?.toString() ?? "",
      active: item.active,
      note: item.note,
    });
    setExpenseFormOpen(true);
    setNotice(null);
  }

  async function saveExpense() {
    if (!payload || !expenseDraft.name.trim()) return;
    const amount = Number(expenseDraft.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0) {
      setNotice("Enter a valid monthly amount.");
      return;
    }
    const body = {
      name: expenseDraft.name.trim(),
      amountCents: Math.round(amount * 100),
      category: expenseDraft.category,
      dueDay: expenseDraft.dueDay ? Number(expenseDraft.dueDay) : null,
      active: expenseDraft.active,
      note: expenseDraft.note.trim(),
    };
    setExpenseBusy(true);
    setNotice(null);
    try {
      if (editingExpenseId) {
        const result = await requestJson<{ expense: FinanceMonthlyExpense }>(
          `/api/workspace/finance/expenses/${editingExpenseId}`,
          { method: "PATCH", body: JSON.stringify(body) },
        );
        setPayload({
          ...payload,
          monthlyExpenses: payload.monthlyExpenses.map((item) =>
            item.id === editingExpenseId ? result.expense : item,
          ),
        });
        setNotice(`${result.expense.name} updated.`);
      } else {
        const result = await requestJson<{ expense: FinanceMonthlyExpense }>(
          "/api/workspace/finance/expenses",
          { method: "POST", body: JSON.stringify(body) },
        );
        setPayload({ ...payload, monthlyExpenses: [...payload.monthlyExpenses, result.expense] });
        setNotice(`${result.expense.name} added to the monthly plan.`);
      }
      setExpenseFormOpen(false);
      setEditingExpenseId(null);
      setExpenseDraft(emptyExpenseDraft);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Could not save expense.");
    } finally {
      setExpenseBusy(false);
    }
  }

  async function deleteExpense(item: FinanceMonthlyExpense) {
    if (!payload || !window.confirm(`Delete “${item.name}” from the monthly plan?`)) return;
    setExpenseBusy(true);
    setNotice(null);
    try {
      await requestJson<{ ok: true }>(`/api/workspace/finance/expenses/${item.id}`, { method: "DELETE" });
      setPayload({
        ...payload,
        monthlyExpenses: payload.monthlyExpenses.filter((expense) => expense.id !== item.id),
      });
      setNotice(`${item.name} removed.`);
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Could not delete expense.");
    } finally {
      setExpenseBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center border-[2.5px] border-black bg-white shadow-brutal">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-fofo-blue" />
          <p className="mt-3 font-mono text-xs uppercase tracking-wide text-black/50">counting the beans…</p>
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="border-[2.5px] border-black bg-white p-6 shadow-brutal">
        <p className="font-display text-2xl font-bold lowercase">the ledger would not open</p>
        <p className="mt-2 text-sm text-black/60">{error || "No finance data is available."}</p>
      </div>
    );
  }

  if (!payload.meta.dataEnd) {
    return (
      <div className="border-[2.5px] border-black bg-white p-8 shadow-brutal">
        <WalletCards className="h-8 w-8 text-fofo-blue" />
        <h2 className="mt-4 font-display text-3xl font-bold lowercase">no ledger yet</h2>
        <p className="mt-2 max-w-xl text-black/60">Import a bank export to unlock trends, recurring-cost detection, and the monthly plan.</p>
      </div>
    );
  }

  const spendChange = previous && previous.spend > 0
    ? Math.round(((current.spend - previous.spend) / previous.spend) * 100)
    : null;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden border-[2.5px] border-black bg-black px-5 py-6 text-white shadow-brutal md:px-7">
        <div className="pointer-events-none absolute -right-12 -top-14 h-48 w-48 rounded-full border-[28px] border-fofo-blue/70" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">{"// private ledger"}</p>
            <h2 className="mt-2 font-display text-4xl font-bold lowercase tracking-tight md:text-5xl">money, without the fog.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
              Bank cash flow is the source of truth. PayPal only helps name merchants, so funded purchases are never counted twice.
            </p>
          </div>
          <div className="border border-white/25 bg-white/10 px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-white/65">
            <span className="block text-white">{payload.meta.transactionCount.toLocaleString("de-AT")} movements</span>
            through {dateLabel(payload.meta.dataEnd)}
          </div>
        </div>
      </section>

      <section aria-label="Current month overview">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="meta text-fofo-blue">NOW / {current.month ? monthLabel(current.month, true) : "CURRENT MONTH"}</p>
            <h3 className="font-display text-3xl font-bold lowercase tracking-tight">the short version</h3>
          </div>
          <p className="font-hand text-xl text-fofo-blue rotate-[-2deg]">partial month, honest numbers ↘</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={incomeProjection ? "expected income" : "income"}
            value={money(expectedIncome)}
            icon={<ArrowDownRight className="h-5 w-5" />}
            detail={incomeProjection
              ? `${money(current.income)} received · +${money(incomeProjection.amountCents)} expected ${incomeProjection.expectedStartDay}–${incomeProjection.expectedEndDay} ${monthLabel(current.month).split(" ")[0]}`
              : "month to date"}
            tone="blue"
          />
          <MetricCard
            label="spent"
            value={money(current.spend)}
            icon={<ArrowUpRight className="h-5 w-5" />}
            detail={spendChange === null || !previous ? "no prior comparison" : `${Math.abs(spendChange)}% ${spendChange <= 0 ? "less" : "more"} than ${monthLabel(previous.month, true)}`}
            tone="pink"
          />
          <MetricCard
            label={incomeProjection ? "expected net cash flow" : "net cash flow"}
            value={money(expectedNet, true)}
            icon={<CircleDollarSign className="h-5 w-5" />}
            detail={savingsRate === null ? "income not recorded yet" : `${savingsRate}% savings rate`}
            tone={expectedNet >= 0 ? "yellow" : "black"}
          />
          <MetricCard
            label="monthly commitments"
            value={money(subscriptionsCents + expensesCents)}
            icon={<CalendarClock className="h-5 w-5" />}
            detail={`${money(subscriptionsCents)} subscriptions · ${money(expensesCents)} fixed`}
            tone="white"
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.75fr)]">
        <div className="min-w-0 border-[2.5px] border-black bg-white p-4 shadow-brutal md:p-6">
          <PanelHeading eyebrow="FLOW / MONTH" title="income against spending" icon={<ArrowUpRight className="h-5 w-5" />}>
            <div className="flex border-[2px] border-black bg-white p-1">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  className={clsx(
                    "px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide transition",
                    range === option ? "bg-fofo-blue text-white" : "text-black/50 hover:text-black",
                  )}
                >
                  {option === 99 ? "all" : `${option}m`}
                </button>
              ))}
            </div>
          </PanelHeading>
          <CashflowBars months={visibleMonthly} incomeProjection={incomeProjection} />
        </div>

        <div className="min-w-0 border-[2.5px] border-black bg-white p-4 shadow-brutal md:p-6">
          <PanelHeading eyebrow="SPEND / CATEGORY" title="where it went" icon={<ReceiptText className="h-5 w-5" />} />
          <CategoryBars items={categoryTotals} transactions={rangeTransactions} />
        </div>
      </section>

      <section className="border-[2.5px] border-black bg-white p-4 shadow-brutal md:p-6">
        <PanelHeading eyebrow="PACE / LATEST MONTH" title="daily spend rhythm" icon={<Sparkles className="h-5 w-5" />} />
        <DailySpend transactions={payload.transactions} month={current.month} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="min-w-0 border-[2.5px] border-black bg-white p-4 shadow-brutal md:p-6">
          <PanelHeading eyebrow="RECURRING / DETECTED" title="subscriptions" icon={<CreditCard className="h-5 w-5" />}>
            <button
              type="button"
              onClick={() => setShowAllSubscriptions((value) => !value)}
              className="inline-flex items-center gap-2 border-[2px] border-black bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wide shadow-brutal-sm hover:bg-black hover:text-white"
            >
              {showAllSubscriptions ? "current only" : "show history"}
              <ChevronDown className={clsx("h-3.5 w-3.5 transition", showAllSubscriptions && "rotate-180")} />
            </button>
          </PanelHeading>
          <p className="mb-4 text-sm leading-relaxed text-black/55">
            Repeated timing plus a stable amount. You stay in charge of the status when the pattern is wrong.
          </p>
          <div className="space-y-2">
            {shownSubscriptions.map((item) => (
              <SubscriptionRow
                key={item.id}
                item={item}
                busy={subscriptionBusy === item.id}
                onStatus={setSubscriptionStatus}
              />
            ))}
            {!shownSubscriptions.length ? (
              <p className="border border-dashed border-black/25 p-4 text-sm text-black/50">No active subscriptions detected.</p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 border-[2.5px] border-black bg-white p-4 shadow-brutal md:p-6">
          <PanelHeading eyebrow="PLAN / MONTHLY" title="fixed expenses" icon={<WalletCards className="h-5 w-5" />}>
            <button
              type="button"
              onClick={openNewExpense}
              className="inline-flex items-center gap-2 border-[2px] border-black bg-fofo-blue px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wide text-white shadow-brutal-sm hover:bg-black"
            >
              <Plus className="h-4 w-4" /> add expense
            </button>
          </PanelHeading>
          <div className="mb-4 flex items-baseline justify-between border-b-[2px] border-black pb-3">
            <span className="text-sm text-black/55">active fixed total</span>
            <strong className="font-display text-3xl font-bold">{money(expensesCents)}</strong>
          </div>

          {expenseFormOpen ? (
            <ExpenseForm
              draft={expenseDraft}
              editing={Boolean(editingExpenseId)}
              busy={expenseBusy}
              onChange={setExpenseDraft}
              onSave={saveExpense}
              onClose={() => setExpenseFormOpen(false)}
            />
          ) : null}

          <div className="space-y-2">
            {payload.monthlyExpenses.map((item) => (
              <div
                key={item.id}
                className={clsx(
                  "flex items-center gap-3 border border-black/15 px-3 py-3",
                  !item.active && "bg-black/[0.035] opacity-55",
                )}
              >
                <span className="h-8 w-1.5 shrink-0" style={{ background: CATEGORY_COLORS[item.category] }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <p className="truncate font-semibold text-black">{item.name}</p>
                    <span className="font-mono text-[9px] uppercase tracking-wide text-black/40">{item.category}</span>
                  </div>
                  <p className="truncate text-xs text-black/45">
                    {item.dueDay ? `due around day ${item.dueDay}` : "no due day"}{item.note ? ` · ${item.note}` : ""}
                  </p>
                </div>
                <strong className="shrink-0 font-mono text-sm">{money(item.amountCents)}</strong>
                <button type="button" aria-label={`Edit ${item.name}`} onClick={() => openEditExpense(item)} className="p-2 text-black/45 hover:bg-fofo-blue hover:text-white">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button type="button" aria-label={`Delete ${item.name}`} onClick={() => deleteExpense(item)} className="p-2 text-black/45 hover:bg-fofo-pink hover:text-white">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {!payload.monthlyExpenses.length && !expenseFormOpen ? (
              <button type="button" onClick={openNewExpense} className="w-full border border-dashed border-black/25 p-5 text-left text-sm text-black/50 hover:border-fofo-blue hover:text-fofo-blue">
                + Add the first fixed monthly cost
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {notice ? (
        <div role="status" className="sticky bottom-4 z-20 flex items-center gap-2 border-[2px] border-black bg-fofo-yellow px-4 py-3 font-mono text-xs font-bold shadow-brutal-sm">
          <Check className="h-4 w-4" /> {notice}
          <button type="button" onClick={() => setNotice(null)} className="ml-auto p-1" aria-label="Dismiss message"><X className="h-4 w-4" /></button>
        </div>
      ) : null}

      <section className="border-[2.5px] border-black bg-white shadow-brutal">
        <div className="border-b-[2.5px] border-black p-4 md:p-6">
          <PanelHeading eyebrow="LEDGER / SEARCH" title="transactions" icon={<ReceiptText className="h-5 w-5" />} />
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <span className="sr-only">Search transactions</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="merchant or description"
                className="w-full border-[2px] border-black bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-fofo-blue"
              />
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full border-[2px] border-black bg-white px-3 py-3 text-sm outline-none focus:border-fofo-blue">
                <option>All</option>
                {transactionCategories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <div className="flex items-center border-[2px] border-black bg-black px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-white">
              {filteredTransactions.length.toLocaleString("de-AT")} matches
            </div>
          </div>
        </div>
        <TransactionTable transactions={filteredTransactions.slice(0, 120)} total={filteredTransactions.length} />
      </section>
    </div>
  );
}

function PanelHeading({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="meta flex items-center gap-2 text-fofo-blue">{icon}{eyebrow}</p>
        <h3 className="mt-1 font-display text-2xl font-bold lowercase tracking-tight md:text-3xl">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ReactNode;
  tone: "blue" | "pink" | "yellow" | "black" | "white";
}) {
  const toneClass = {
    blue: "bg-fofo-blue text-white",
    pink: "bg-fofo-pink text-white",
    yellow: "bg-fofo-yellow text-black",
    black: "bg-black text-white",
    white: "bg-white text-black",
  }[tone];
  return (
    <div className={clsx("min-h-40 border-[2.5px] border-black p-4 shadow-brutal", toneClass)}>
      <div className="flex items-center justify-between gap-3 font-mono text-[10px] font-bold uppercase tracking-wide opacity-70">
        {label}{icon}
      </div>
      <p className="mt-6 break-words font-display text-3xl font-bold tracking-tight tabular-nums md:text-4xl">{value}</p>
      <p className="mt-2 text-xs opacity-65">{detail || "month to date"}</p>
    </div>
  );
}

function CashflowBars({
  months,
  incomeProjection,
}: {
  months: MonthlySummary[];
  incomeProjection: IncomeProjection | null;
}) {
  const projectedMonth = months.at(-1)?.month;
  const maximum = Math.max(
    1,
    ...months.flatMap((item) => [
      item.income + (incomeProjection && item.month === projectedMonth ? incomeProjection.amountCents : 0),
      item.spend,
    ]),
  );
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex h-72 min-w-max items-end gap-2 border-b-[2px] border-black/20 px-1 pt-8" style={{ width: `${Math.max(100, months.length * 88)}px` }}>
        {months.map((item) => {
          const projected = Boolean(incomeProjection && item.month === projectedMonth);
          const displayIncome = item.income + (projected ? incomeProjection!.amountCents : 0);
          const displayNet = displayIncome - item.spend;
          return (
          <div key={item.month} className="flex h-full w-20 shrink-0 flex-col justify-end">
            <div className="flex flex-1 items-end justify-center gap-1.5" title={`${monthLabel(item.month, true)}: ${money(displayIncome)} ${projected ? "expected" : "in"}, ${money(item.spend)} out`}>
              <div
                className="w-5 border border-black"
                style={{
                  height: `${Math.max(3, (displayIncome / maximum) * 100)}%`,
                  background: projected
                    ? "repeating-linear-gradient(135deg, #0008ff 0 6px, #ffffff 6px 9px)"
                    : "#0008ff",
                }}
              />
              <div className="w-5 border border-black bg-fofo-pink" style={{ height: `${Math.max(3, (item.spend / maximum) * 100)}%` }} />
            </div>
            <div className="pt-2 text-center">
              <p className="font-mono text-[9px] uppercase text-black/55">{monthLabel(item.month)}{projected ? " ~" : ""}</p>
              <p className={clsx("font-mono text-[9px] font-bold", displayNet >= 0 ? "text-emerald-700" : "text-red-600")}>{money(displayNet, true)}</p>
            </div>
          </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-5 font-mono text-[9px] uppercase tracking-wide text-black/50">
        <span className="flex items-center gap-2"><i className="h-3 w-3 border border-black bg-fofo-blue" /> income</span>
        <span className="flex items-center gap-2"><i className="h-3 w-3 border border-black bg-fofo-pink" /> spending</span>
        {incomeProjection ? <span>striped = expected</span> : null}
        <span>net shown below each month</span>
      </div>
    </div>
  );
}

function CategoryBars({
  items,
  transactions,
}: {
  items: Array<{ name: string; cents: number }>;
  transactions: FinanceTransaction[];
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const transactionsByCategory = useMemo(() => {
    const grouped = new Map<string, FinanceTransaction[]>();

    for (const transaction of transactions) {
      if (transaction.amountCents >= 0 || transaction.category === "Transfers") continue;
      const group = grouped.get(transaction.category) ?? [];
      group.push(transaction);
      grouped.set(transaction.category, group);
    }

    for (const group of grouped.values()) {
      group.sort((left, right) => {
        const amountDifference = Math.abs(right.amountCents) - Math.abs(left.amountCents);
        return amountDifference || right.bookedOn.localeCompare(left.bookedOn);
      });
    }

    return grouped;
  }, [transactions]);
  const max = items[0]?.cents ?? 1;
  const total = items.reduce((sum, item) => sum + item.cents, 0);

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const categoryTransactions = transactionsByCategory.get(item.name) ?? [];
        const expanded = expandedCategory === item.name;
        const detailId = `category-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-details`;
        const largest = categoryTransactions.reduce(
          (largestAmount, transaction) => Math.max(largestAmount, Math.abs(transaction.amountCents)),
          0,
        );

        return (
          <div key={item.name} className={clsx("border border-transparent", expanded && "border-black bg-black/[0.025]")}>
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={detailId}
              onClick={() => setExpandedCategory(expanded ? null : item.name)}
              className="group w-full p-1 text-left outline-none transition hover:bg-black/[0.035] focus-visible:ring-2 focus-visible:ring-fofo-blue focus-visible:ring-offset-2"
            >
              <span className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <i className="h-2.5 w-2.5 shrink-0 border border-black" style={{ background: CATEGORY_COLORS[item.name] }} />
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[11px]">
                  {shortMoney(item.cents)} · {Math.round((item.cents / Math.max(1, total)) * 100)}%
                  <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
                </span>
              </span>
              <span className="block h-2.5 border border-black/15 bg-black/5">
                <span className="block h-full" style={{ width: `${Math.max(2, (item.cents / max) * 100)}%`, background: CATEGORY_COLORS[item.name] }} />
              </span>
            </button>

            {expanded ? (
              <div id={detailId} role="region" aria-label={`${item.name} transaction details`} className="border-t border-black/15 px-2 pb-2 pt-3">
                <div className="mb-3 grid grid-cols-3 gap-2 border-b border-black/15 pb-3 text-center">
                  <CategoryDetailMetric label="charges" value={String(categoryTransactions.length)} />
                  <CategoryDetailMetric label="average" value={shortMoney(categoryTransactions.length ? Math.round(item.cents / categoryTransactions.length) : 0)} />
                  <CategoryDetailMetric label="largest" value={shortMoney(largest)} />
                </div>
                <div className="max-h-72 divide-y divide-black/10 overflow-y-auto pr-1">
                  {categoryTransactions.map((transaction) => (
                    <div key={transaction.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 py-2 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{transaction.merchant}</p>
                        <p className="truncate text-[11px] text-black/45">
                          {dateLabel(transaction.bookedOn)} · {transaction.description || transaction.provider}
                        </p>
                      </div>
                      <span className="self-center whitespace-nowrap font-mono text-[11px] font-bold text-red-600">
                        {money(transaction.amountCents, true)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      {!items.length ? <p className="text-sm text-black/50">No spending in this range.</p> : null}
    </div>
  );
}

function CategoryDetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-mono text-[9px] uppercase tracking-wide text-black/45">{label}</p>
      <p className="truncate font-mono text-xs font-bold">{value}</p>
    </div>
  );
}

function DailySpend({ transactions, month }: { transactions: FinanceTransaction[]; month: string }) {
  const daysInMonth = month ? new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate() : 31;
  const values = Array.from({ length: daysInMonth }, () => 0);
  for (const item of transactions) {
    if (monthKey(item.bookedOn) !== month || item.amountCents >= 0 || item.category === "Transfers") continue;
    values[Number(item.bookedOn.slice(8, 10)) - 1] += Math.abs(item.amountCents);
  }
  const max = Math.max(1, ...values);
  return (
    <div>
      <div className="overflow-x-auto">
        <div className="flex h-36 min-w-[620px] items-end gap-1 border-b-[2px] border-black/20 pt-4" aria-label={`Daily spending in ${monthLabel(month, true)}`}>
          {values.map((value, index) => (
            <div key={index} className="group relative flex h-full flex-1 items-end" title={`${index + 1} ${monthLabel(month, true)}: ${money(value)}`}>
              <div className={clsx("w-full border-x border-t border-black/40", value > 0 ? "bg-fofo-blue" : "bg-black/5")} style={{ height: `${value ? Math.max(4, (value / max) * 100) : 2}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between font-mono text-[9px] uppercase text-black/40"><span>day 1</span><span>day {daysInMonth}</span></div>
    </div>
  );
}

function SubscriptionRow({
  item,
  busy,
  onStatus,
}: {
  item: FinanceSubscription;
  busy: boolean;
  onStatus: (item: FinanceSubscription, status: SubscriptionStatus) => void;
}) {
  return (
    <div className={clsx("grid gap-3 border border-black/15 p-3 sm:grid-cols-[minmax(0,1fr)_auto]", item.status !== "active" && "bg-black/[0.035] opacity-65")}>
      <div className="flex min-w-0 gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center border-[2px] border-black bg-fofo-yellow font-display text-lg font-bold">{item.name.slice(0, 1)}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="truncate font-semibold">{item.name}</p>
            <span className={clsx("font-mono text-[9px] uppercase tracking-wide", item.confidence === "high" ? "text-emerald-700" : "text-amber-700")}>{item.confidence} confidence</span>
          </div>
          <p className="text-xs text-black/50">last {dateLabel(item.lastChargeOn)} · {item.occurrences} payments{item.nextChargeOn && item.status === "active" ? ` · next ~${dateLabel(item.nextChargeOn)}` : ""}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <strong className="font-mono text-sm">{money(item.amountCents)}<span className="text-[9px] font-normal text-black/40"> /mo</span></strong>
        <label className="relative">
          <span className="sr-only">Status for {item.name}</span>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin text-fofo-blue" /> : (
            <select value={item.status} onChange={(event) => onStatus(item, event.target.value as SubscriptionStatus)} className="border border-black bg-white px-2 py-1.5 font-mono text-[9px] uppercase">
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="cancelled">cancelled</option>
            </select>
          )}
        </label>
      </div>
    </div>
  );
}

function ExpenseForm({
  draft,
  editing,
  busy,
  onChange,
  onSave,
  onClose,
}: {
  draft: ExpenseDraft;
  editing: boolean;
  busy: boolean;
  onChange: (draft: ExpenseDraft) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mb-4 border-[2px] border-black bg-fofo-yellow/25 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-display text-xl font-bold lowercase">{editing ? "edit expense" : "add monthly expense"}</p>
        <button type="button" onClick={onClose} aria-label="Close expense editor"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-black/60">Name<input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} className="mt-1 w-full border-[2px] border-black bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-fofo-blue" placeholder="Rent, insurance…" /></label>
        <label className="text-xs text-black/60">Monthly amount (€)<input inputMode="decimal" value={draft.amount} onChange={(event) => onChange({ ...draft, amount: event.target.value })} className="mt-1 w-full border-[2px] border-black bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-fofo-blue" placeholder="0.00" /></label>
        <label className="text-xs text-black/60">Category<select value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value as FinanceCategory })} className="mt-1 w-full border-[2px] border-black bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-fofo-blue">{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="text-xs text-black/60">Due day<input type="number" min="1" max="31" value={draft.dueDay} onChange={(event) => onChange({ ...draft, dueDay: event.target.value })} className="mt-1 w-full border-[2px] border-black bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-fofo-blue" placeholder="optional" /></label>
        <label className="text-xs text-black/60 sm:col-span-2">Note<input value={draft.note} onChange={(event) => onChange({ ...draft, note: event.target.value })} className="mt-1 w-full border-[2px] border-black bg-white px-3 py-2.5 text-sm text-black outline-none focus:border-fofo-blue" placeholder="optional context" /></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={(event) => onChange({ ...draft, active: event.target.checked })} className="h-4 w-4 accent-fofo-blue" /> active in monthly total</label>
        <button type="button" onClick={onSave} disabled={busy || !draft.name.trim()} className="ml-auto inline-flex items-center gap-2 border-[2px] border-black bg-fofo-blue px-4 py-2.5 text-sm font-bold text-white shadow-brutal-sm disabled:opacity-50">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {editing ? "save changes" : "add expense"}
        </button>
      </div>
    </div>
  );
}

function TransactionTable({ transactions, total }: { transactions: FinanceTransaction[]; total: number }) {
  return (
    <div>
      <div className="hidden grid-cols-[110px_minmax(220px,1fr)_150px_120px_130px] gap-3 border-b border-black/15 bg-black px-4 py-2 font-mono text-[9px] uppercase tracking-wide text-white md:grid md:px-6">
        <span>Date</span><span>Merchant</span><span>Category</span><span>Source</span><span className="text-right">Amount</span>
      </div>
      <div className="divide-y divide-black/10">
        {transactions.map((item) => (
          <div key={item.id} className="grid gap-1 px-4 py-3 hover:bg-fofo-yellow/15 md:grid-cols-[110px_minmax(220px,1fr)_150px_120px_130px] md:items-center md:gap-3 md:px-6">
            <span className="font-mono text-[10px] text-black/45">{dateLabel(item.bookedOn)}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{item.merchant}</p><p className="truncate text-[11px] text-black/40">{item.description}</p></div>
            <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wide text-black/55"><i className="h-2.5 w-2.5 shrink-0 border border-black" style={{ background: CATEGORY_COLORS[item.category] }} />{item.category}</span>
            <span className="font-mono text-[9px] uppercase tracking-wide text-black/45">{item.provider === "paypal" ? "PayPal → bank" : "bank"}</span>
            <strong className={clsx("font-mono text-sm md:text-right", item.amountCents >= 0 ? "text-emerald-700" : "text-black")}>{money(item.amountCents, true)}</strong>
          </div>
        ))}
        {!transactions.length ? <p className="p-8 text-center text-sm text-black/45">No transactions match this view.</p> : null}
      </div>
      {total > transactions.length ? <p className="border-t border-black/15 p-3 text-center font-mono text-[9px] uppercase tracking-wide text-black/40">showing first {transactions.length} of {total} matches — refine the filters to narrow it down</p> : null}
    </div>
  );
}
