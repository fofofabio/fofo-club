"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Sun, TriangleAlert } from "lucide-react";

type Todo = {
  id: string;
  text: string;
  project: string;
  done: boolean;
  pinned: boolean;
  dueDate: string | null;
  createdAt: string;
};

type HourEntry = {
  date: string;
  start: string;
  end: string;
};

function currentDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateKeyBefore(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateKeyAfter(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekEnd(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00`);
  const day = d.getDay();
  const toSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + toSunday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatOutlookDate(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(d);
}

function formatTodayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatDuration(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

function ageDays(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

type Props = {
  todos: Todo[];
};

export default function DailyBriefCard({ todos }: Props) {
  const [visible, setVisible] = useState(false);
  const [weeklyMinutes, setWeeklyMinutes] = useState<number | null>(null);
  const [weeklyDays, setWeeklyDays] = useState(0);

  const today = currentDateKey();
  const storageKey = `workspace_brief_seen_${today}`;

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setVisible(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!visible) return;

    fetch("/api/workspace/time-entries")
      .then((r) => r.json())
      .then((payload: { entries?: HourEntry[] }) => {
        const cutoff = dateKeyBefore(7);
        const recent = (payload.entries ?? []).filter(
          (e) => e.date >= cutoff && e.date <= today,
        );
        const total = recent.reduce(
          (sum, e) => sum + Math.max(0, timeToMinutes(e.end) - timeToMinutes(e.start)),
          0,
        );
        const uniqueDays = new Set(recent.map((e) => e.date)).size;
        setWeeklyMinutes(total);
        setWeeklyDays(uniqueDays);
      })
      .catch(() => setWeeklyMinutes(0));
  }, [visible, today]);

  function dismiss() {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const dueToday = todos.filter((t) => !t.done && t.dueDate === today);

  const lingering = todos
    .filter((t) => !t.done && !t.pinned && ageDays(t.createdAt) >= 7)
    .sort((a, b) => ageDays(b.createdAt) - ageDays(a.createdAt))
    .slice(0, 3);

  const thisWeekEnd = getWeekEnd(today);
  const nextWeekEnd = getWeekEnd(dateKeyAfter(7));
  const horizon = dateKeyAfter(14);

  const upcomingGroups: { label: string; items: Todo[] }[] = [];
  const upcoming = todos
    .filter((t) => !t.done && t.dueDate && t.dueDate > today && t.dueDate <= horizon)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  const thisWeek = upcoming.filter((t) => t.dueDate! <= thisWeekEnd);
  const nextWeek = upcoming.filter((t) => t.dueDate! > thisWeekEnd && t.dueDate! <= nextWeekEnd);
  const later = upcoming.filter((t) => t.dueDate! > nextWeekEnd);

  if (thisWeek.length) upcomingGroups.push({ label: "This week", items: thisWeek });
  if (nextWeek.length) upcomingGroups.push({ label: "Next week", items: nextWeek });
  if (later.length) upcomingGroups.push({ label: "Later", items: later });

  const avgMinutes =
    weeklyDays > 0 && weeklyMinutes !== null
      ? Math.round(weeklyMinutes / weeklyDays)
      : null;

  return (
    <div className="mb-4 overflow-hidden rounded-none border-[2.5px] border-black bg-black text-white shadow-brutal">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
        <Sun className="h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <p className="meta text-white/45">DAILY BRIEF</p>
          <p className="mt-0.5 font-display text-2xl tracking-tight">{formatTodayLabel()}</p>
        </div>
      </div>

      {/* Four panels */}
      <div className="grid divide-y divide-white/10 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {/* Due today */}
        <div className="px-6 py-5">
          <p className="meta text-white/45">DUE TODAY</p>
          {dueToday.length === 0 ? (
            <p className="mt-3 text-sm text-white/40">Nothing due, clear day.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {dueToday.map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-none bg-fofo-yellow" />
                  <span className="text-sm leading-snug text-white/85">{t.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Lingering tasks */}
        <div className="px-6 py-5">
          <p className="meta text-white/45">BEEN SITTING A WHILE</p>
          {lingering.length === 0 ? (
            <p className="mt-3 text-sm text-white/40">No lingering tasks. Nice.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {lingering.map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span className="text-sm leading-snug">
                    <span className="text-white/75">{t.text}</span>
                    <span className="ml-1.5 text-white/30">{ageDays(t.createdAt)}d old</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hours pulse */}
        <div className="px-6 py-5">
          <p className="meta text-white/45">LAST 7 DAYS</p>
          {weeklyMinutes === null ? (
            <p className="mt-3 text-sm text-white/40">Loading…</p>
          ) : weeklyMinutes === 0 ? (
            <p className="mt-3 text-sm text-white/40">No hours logged yet this week.</p>
          ) : (
            <div className="mt-3">
              <p className="font-display text-3xl tracking-tight">
                {formatDuration(weeklyMinutes)}
              </p>
              <p className="mt-1 text-sm text-white/45">
                across {weeklyDays} day{weeklyDays !== 1 ? "s" : ""}
                {avgMinutes ? ` · ~${formatDuration(avgMinutes)}/day` : ""}
              </p>
            </div>
          )}
        </div>

        {/* Outlook */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-white/45" />
            <p className="meta text-white/45">OUTLOOK</p>
          </div>
          {upcomingGroups.length === 0 ? (
            <p className="mt-3 text-sm text-white/40">Nothing scheduled in the next 2 weeks.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {upcomingGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-widest text-white/30">
                    {group.label}
                  </p>
                  <ul className="space-y-2">
                    {group.items.map((t) => (
                      <li key={t.id} className="flex items-start gap-2">
                        <span className="mt-[3px] shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/50">
                          {formatOutlookDate(t.dueDate!)}
                        </span>
                        <span className="truncate text-sm leading-snug text-white/75">{t.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end border-t border-white/10 px-6 py-4">
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex items-center gap-2 rounded-none bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:-translate-y-0.5"
        >
          Got it, let&apos;s go
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
