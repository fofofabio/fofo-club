"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Clipboard,
  FolderKanban,
  PencilLine,
  Play,
  Square,
  TimerReset,
  Trash2,
} from "lucide-react";

const SLOT_MINUTES = 15;
const VISIBLE_START_MINUTE = 6 * 60;
const VISIBLE_END_MINUTE = 19 * 60;
const VISIBLE_MINUTES = VISIBLE_END_MINUTE - VISIBLE_START_MINUTE;
const VISIBLE_SLOTS = VISIBLE_MINUTES / SLOT_MINUTES;
const SLOT_WIDTH = 32;
const TIMELINE_WIDTH = VISIBLE_SLOTS * SLOT_WIDTH;
const LANE_HEIGHT = 56;
const TRACK_PADDING = 18;

type HourEntry = {
  id: string;
  project: string;
  task: string;
  date: string;
  start: string;
  end: string;
  createdAt: string;
};

type ActiveSession = {
  id: string;
  project: string;
  task: string;
  startedAt: string;
  timezone: string;
};

type MinuteRange = {
  start: number;
  end: number;
};

type DragState = {
  anchor: number;
  current: number;
};

type TimelineEntry = HourEntry & {
  startMinute: number;
  endMinute: number;
  lane: number;
};

type RecentActivity = {
  project: string;
  task: string;
  lastDate: string;
};

type DraftEntry = {
  project: string;
  task: string;
  date: string;
  start: string;
  end: string;
};

type WorkspacePayload = {
  entries: HourEntry[];
  activeSession: ActiveSession | null;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 24 * 60));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 24) {
    return "24:00";
  }

  return `${pad(hours)}:${pad(minutes)}`;
}

function minutesToInputTime(totalMinutes: number) {
  if (totalMinutes >= 24 * 60) {
    return "23:59";
  }

  return minutesToTime(totalMinutes);
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function roundTime(date: Date, stepMinutes: number) {
  const copy = new Date(date);
  copy.setSeconds(0, 0);
  const minutes = copy.getMinutes();
  const rounded = Math.round(minutes / stepMinutes) * stepMinutes;
  copy.setMinutes(rounded);

  return copy;
}

function getDurationMinutes(entry: Pick<HourEntry, "date" | "start" | "end">) {
  const start = toLocalDateTime(entry.date, entry.start);
  const end = toLocalDateTime(entry.date, entry.end);
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${minutes}m`;
  }

  if (!minutes) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function formatDayLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function formatWeekday(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function formatMonthDay(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function getWeekStart(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function getWeekDays(dateKey: string) {
  const start = getWeekStart(new Date(`${dateKey}T12:00:00`));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function formatWeekRange(dateKey: string) {
  const weekDays = getWeekDays(dateKey);
  const first = weekDays[0];
  const last = weekDays[6];
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });

  return `${formatter.format(first)} - ${formatter.format(last)}`;
}

function sortEntries(entries: HourEntry[]) {
  return [...entries].sort((left, right) => {
    const leftStamp = `${left.date}T${left.start}`;
    const rightStamp = `${right.date}T${right.start}`;
    return leftStamp.localeCompare(rightStamp);
  });
}

function buildDefaultDraft(entries: HourEntry[], date = toDateKey(new Date())): DraftEntry {
  const sameDayEntries = sortEntries(entries).filter((entry) => entry.date === date);
  const lastEntry = sameDayEntries.at(-1);
  const todayKey = toDateKey(new Date());

  if (lastEntry) {
    const start = lastEntry.end;

    return {
      project: lastEntry.project,
      task: "",
      date,
      start,
      end: minutesToInputTime(Math.min(timeToMinutes(start) + 60, 24 * 60)),
    };
  }

  if (date === todayKey) {
    const rounded = roundTime(new Date(), SLOT_MINUTES);
    const start = toTimeValue(rounded);

    return {
      project: "",
      task: "",
      date,
      start,
      end: minutesToInputTime(Math.min(timeToMinutes(start) + 60, 24 * 60)),
    };
  }

  return {
    project: "",
    task: "",
    date,
    start: "09:00",
    end: "10:00",
  };
}

function isDraftValid(draft: DraftEntry) {
  return Boolean(draft.project.trim()) && timeToMinutes(draft.end) > timeToMinutes(draft.start);
}

function normalizeRange(anchor: number, current: number): MinuteRange {
  const start = Math.max(VISIBLE_START_MINUTE, Math.min(anchor, current));
  const end = Math.min(VISIBLE_END_MINUTE, Math.max(anchor, current) + SLOT_MINUTES);

  return { start, end };
}

function entryRange(entry: Pick<HourEntry, "start" | "end">): MinuteRange {
  return {
    start: timeToMinutes(entry.start),
    end: timeToMinutes(entry.end),
  };
}

function minuteToX(totalMinutes: number) {
  return ((totalMinutes - VISIBLE_START_MINUTE) / SLOT_MINUTES) * SLOT_WIDTH;
}

function minutesToWidth(durationMinutes: number) {
  return (durationMinutes / SLOT_MINUTES) * SLOT_WIDTH;
}

function buildTimelineEntries(entries: HourEntry[]): { items: TimelineEntry[]; laneCount: number } {
  const laneEnds: number[] = [];
  const items = entries.flatMap((entry) => {
    const rawStartMinute = timeToMinutes(entry.start);
    const rawEndMinute = timeToMinutes(entry.end);

    if (rawEndMinute <= VISIBLE_START_MINUTE || rawStartMinute >= VISIBLE_END_MINUTE) {
      return [];
    }

    const startMinute = Math.max(rawStartMinute, VISIBLE_START_MINUTE);
    const endMinute = Math.min(rawEndMinute, VISIBLE_END_MINUTE);
    let lane = laneEnds.findIndex((laneEnd) => startMinute >= laneEnd);

    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(endMinute);
    } else {
      laneEnds[lane] = endMinute;
    }

    return [
      {
        ...entry,
        startMinute,
        endMinute,
        lane,
      },
    ];
  });

  return {
    items,
    laneCount: Math.max(1, laneEnds.length),
  };
}

function uniqueActivities(entries: HourEntry[]) {
  const seen = new Set<string>();
  const activities: RecentActivity[] = [];

  [...entries].reverse().forEach((entry) => {
    const key = `${entry.project.trim()}::${entry.task.trim()}`;

    if (!entry.project.trim() || seen.has(key)) {
      return;
    }

    seen.add(key);
    activities.push({
      project: entry.project.trim(),
      task: entry.task.trim(),
      lastDate: entry.date,
    });
  });

  return activities.slice(0, 8);
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const payload = (await response
    .json()
    .catch(() => ({ error: "Unexpected response." }))) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Request failed.");
  }

  return payload as T;
}

type HoursTrackerProps = {
  pendingDraft?: { project: string; task: string } | null;
  onPendingDraftApplied?: () => void;
};

export default function HoursTracker({ pendingDraft, onPendingDraftApplied }: HoursTrackerProps) {
  const timelineViewportRef = useRef<HTMLDivElement | null>(null);
  const [entries, setEntries] = useState<HourEntry[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [draft, setDraft] = useState<DraftEntry>(() => buildDefaultDraft([]));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [selectedRange, setSelectedRange] = useState<MinuteRange | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [timerTick, setTimerTick] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    const todayKey = toDateKey(new Date());

    async function loadWorkspaceData() {
      try {
        const payload = await requestJson<WorkspacePayload>("/api/workspace/time-entries", {
          cache: "no-store",
        });

        if (cancelled) {
          return;
        }

        const sorted = sortEntries(payload.entries);
        setEntries(sorted);
        setActiveSession(payload.activeSession);
        setDraft(buildDefaultDraft(sorted, todayKey));
        setSelectedDate(todayKey);
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Failed to load workspace data.");
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void loadWorkspaceData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => setMessage(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timeout = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  useEffect(() => {
    const interval = window.setInterval(() => setTimerTick(Date.now()), 15000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pendingDraft) return;
    setDraft((prev) => ({ ...prev, project: pendingDraft.project, task: pendingDraft.task }));
    setMessage(`Pre-filled from To-Do: ${pendingDraft.project}`);
    onPendingDraftApplied?.();
  }, [pendingDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const viewport = timelineViewportRef.current;

      if (!viewport) {
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const relativeX = viewport.scrollLeft + event.clientX - rect.left;
      const clampedX = Math.max(0, Math.min(relativeX, TIMELINE_WIDTH - 1));
      const snappedSlot = Math.floor(clampedX / SLOT_WIDTH);

      setDragState((current) =>
        current
          ? {
              ...current,
              current: VISIBLE_START_MINUTE + snappedSlot * SLOT_MINUTES,
            }
          : current,
      );
    };

    const handlePointerUp = () => {
      setSelectedRange(normalizeRange(dragState.anchor, dragState.current));
      setDragState(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  useEffect(() => {
    if (dragState || !selectedRange) {
      return;
    }

    setDraft((current) => ({
      ...current,
      date: selectedDate,
      start: minutesToInputTime(selectedRange.start),
      end: minutesToInputTime(selectedRange.end),
    }));
  }, [dragState, selectedDate, selectedRange]);

  useEffect(() => {
    if (editingId) {
      return;
    }

    setDraft((current) => ({
      ...current,
      date: selectedDate,
    }));
  }, [editingId, selectedDate]);

  const todayKey = toDateKey(new Date());
  const sortedEntries = useMemo(() => sortEntries(entries), [entries]);
  const selectedWeekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const selectedWeekStart = toDateKey(selectedWeekDays[0]);
  const selectedWeekEnd = toDateKey(selectedWeekDays[6]);

  const selectedDayEntries = useMemo(
    () => sortedEntries.filter((entry) => entry.date === selectedDate),
    [selectedDate, sortedEntries],
  );

  const selectedWeekEntries = useMemo(
    () =>
      sortedEntries.filter(
        (entry) => entry.date >= selectedWeekStart && entry.date <= selectedWeekEnd,
      ),
    [selectedWeekEnd, selectedWeekStart, sortedEntries],
  );

  const selectedDayMinutes = useMemo(
    () => selectedDayEntries.reduce((total, entry) => total + getDurationMinutes(entry), 0),
    [selectedDayEntries],
  );

  const selectedWeekMinutes = useMemo(
    () =>
      selectedWeekEntries.reduce((total, entry) => total + getDurationMinutes(entry), 0),
    [selectedWeekEntries],
  );

  const activeMinutes = useMemo(() => {
    if (!activeSession) {
      return 0;
    }

    const startedAt = new Date(activeSession.startedAt);
    return Math.max(1, Math.round((timerTick - startedAt.getTime()) / 60000));
  }, [activeSession, timerTick]);

  const currentMinute = useMemo(() => {
    const now = new Date(timerTick);
    return now.getHours() * 60 + now.getMinutes();
  }, [timerTick]);

  const dailyTotals = useMemo(() => {
    const totals = new Map<string, number>();

    selectedWeekEntries.forEach((entry) => {
      totals.set(entry.date, (totals.get(entry.date) ?? 0) + getDurationMinutes(entry));
    });

    return totals;
  }, [selectedWeekEntries]);

  const weeklyProjectTotals = useMemo(() => {
    const totals = new Map<string, number>();

    selectedWeekEntries.forEach((entry) => {
      const project = entry.project.trim();
      totals.set(project, (totals.get(project) ?? 0) + getDurationMinutes(entry));
    });

    return [...totals.entries()]
      .map(([project, minutes]) => ({ project, minutes }))
      .sort((left, right) => right.minutes - left.minutes);
  }, [selectedWeekEntries]);

  const recentProjects = useMemo(() => {
    const seen = new Set<string>();

    return [...sortedEntries]
      .reverse()
      .map((entry) => entry.project.trim())
      .filter((project) => {
        if (!project || seen.has(project)) {
          return false;
        }

        seen.add(project);
        return true;
      })
      .slice(0, 8);
  }, [sortedEntries]);

  const recentActivities = useMemo(() => uniqueActivities(sortedEntries), [sortedEntries]);
  const timeline = useMemo(() => buildTimelineEntries(selectedDayEntries), [selectedDayEntries]);

  const liveRange = useMemo(() => {
    if (!activeSession || selectedDate !== todayKey) {
      return null;
    }

    const startedAt = new Date(activeSession.startedAt);
    const start = startedAt.getHours() * 60 + startedAt.getMinutes();
    const end = Math.min(24 * 60, start + activeMinutes);

    return { start, end };
  }, [activeMinutes, activeSession, selectedDate, todayKey]);

  const timelineRange = dragState
    ? normalizeRange(dragState.anchor, dragState.current)
    : selectedRange;

  const trackHeight = Math.max(timeline.laneCount * LANE_HEIGHT + TRACK_PADDING * 2, 168);

  function updateDraft<K extends keyof DraftEntry>(key: K, value: DraftEntry[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetDraft(nextEntries = entries, date = selectedDate) {
    setDraft(buildDefaultDraft(nextEntries, date));
    setEditingId(null);
    setSelectedRange(null);
  }

  async function saveDraft() {
    if (!isDraftValid(draft)) {
      setMessage("Add a project and a valid time range.");
      return;
    }

    try {
      const payload = await requestJson<{ entry: HourEntry }>(
        editingId
          ? `/api/workspace/time-entries/${editingId}`
          : "/api/workspace/time-entries",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify({
            project: draft.project.trim(),
            task: draft.task.trim(),
            date: draft.date,
            start: draft.start,
            end: draft.end,
          }),
        },
      );

      const nextEntries = sortEntries(
        editingId
          ? entries.map((entry) => (entry.id === editingId ? payload.entry : entry))
          : [...entries, payload.entry],
      );

      setEntries(nextEntries);
      setSelectedDate(draft.date);
      resetDraft(nextEntries, draft.date);
      setMessage(editingId ? "Entry updated." : "Block saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save block.");
    }
  }

  async function startTimer() {
    if (!draft.project.trim()) {
      setMessage("Add a project before starting the timer.");
      return;
    }

    try {
      const payload = await requestJson<{ activeSession: ActiveSession }>(
        "/api/workspace/active-session",
        {
          method: "POST",
          body: JSON.stringify({
            project: draft.project.trim(),
            task: draft.task.trim(),
            timezone: getBrowserTimeZone(),
          }),
        },
      );

      setActiveSession(payload.activeSession);
      setMessage("Timer started.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to start timer.");
    }
  }

  async function stopTimer() {
    if (!activeSession) {
      return;
    }

    try {
      const payload = await requestJson<{ entry: HourEntry; activeSessionId: string }>(
        "/api/workspace/active-session",
        {
          method: "DELETE",
        },
      );

      const nextEntries = sortEntries([...entries, payload.entry]);
      setEntries(nextEntries);
      setActiveSession(null);
      setSelectedDate(payload.entry.date);
      resetDraft(nextEntries, payload.entry.date);
      setMessage("Timer saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to stop timer.");
    }
  }

  async function resumeActivity(project: string, task: string) {
    if (activeSession) {
      setMessage("Stop the current timer before continuing another activity.");
      return;
    }

    try {
      const payload = await requestJson<{ activeSession: ActiveSession }>(
        "/api/workspace/active-session",
        {
          method: "POST",
          body: JSON.stringify({
            project,
            task,
            timezone: getBrowserTimeZone(),
          }),
        },
      );

      setActiveSession(payload.activeSession);
      setDraft((current) => ({
        ...current,
        project,
        task,
        date: todayKey,
      }));
      setSelectedDate(todayKey);
      setMessage(`Continuing ${project}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to continue activity.");
    }
  }

  function editEntry(entry: HourEntry) {
    setEditingId(entry.id);
    setSelectedDate(entry.date);
    setSelectedRange(entryRange(entry));
    setDraft({
      project: entry.project,
      task: entry.task,
      date: entry.date,
      start: entry.start,
      end: entry.end,
    });
    setMessage("Editing block.");
  }

  async function deleteEntry(entryId: string) {
    try {
      await requestJson<{ ok: true }>(`/api/workspace/time-entries/${entryId}`, {
        method: "DELETE",
      });

      const nextEntries = entries.filter((entry) => entry.id !== entryId);
      setEntries(nextEntries);

      if (editingId === entryId) {
        resetDraft(nextEntries);
      }

      setMessage("Block deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete block.");
    }
  }

  function selectDate(dateKey: string) {
    setSelectedDate(dateKey);
    setSelectedRange(null);

    if (!editingId) {
      setDraft((current) => ({
        ...current,
        date: dateKey,
      }));
    }
  }

  function handleTimelinePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const viewport = timelineViewportRef.current;

    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const relativeX = viewport.scrollLeft + event.clientX - rect.left;
    const clampedX = Math.max(0, Math.min(relativeX, TIMELINE_WIDTH - 1));
    const snappedSlot = Math.floor(clampedX / SLOT_WIDTH);
    const minute = VISIBLE_START_MINUTE + snappedSlot * SLOT_MINUTES;

    setDragState({ anchor: minute, current: minute });
    setSelectedRange(null);

    if (!editingId) {
      setDraft((current) => ({
        ...current,
        date: selectedDate,
      }));
    }
  }

  async function copyWeekReport() {
    const detailLines = selectedWeekDays.flatMap((day) => {
      const dateKey = toDateKey(day);
      const dayEntries = selectedWeekEntries.filter((entry) => entry.date === dateKey);

      if (!dayEntries.length) {
        return [];
      }

      return [
        `${formatWeekday(dateKey)} ${formatMonthDay(dateKey)}`,
        ...dayEntries.map((entry) => {
          const task = entry.task ? ` | ${entry.task}` : "";
          return `${entry.start}-${entry.end} | ${entry.project}${task}`;
        }),
        "",
      ];
    });

    const summaryLines = weeklyProjectTotals.map(
      (project) => `- ${project.project}: ${formatDuration(project.minutes)}`,
    );

    const report = [
      `Fofo Club admin weekly report (${formatWeekRange(selectedDate)})`,
      "",
      "Project totals",
      ...summaryLines,
      "",
      "Daily log",
      ...detailLines,
    ]
      .join("\n")
      .trim();

    try {
      await navigator.clipboard.writeText(report);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0 space-y-4">
        <div className="rounded-none border-[2.5px] border-black bg-white p-4 shadow-brutal md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="meta text-fofo-blue">HOURS TRACKER</p>
              <h2 className="mt-1 font-display font-bold lowercase text-3xl tracking-tight text-black md:text-4xl">
                Day timeline
              </h2>
              <p className="mt-2 text-sm leading-6 text-black/60">
                drag across the day to carve out a block. or punch one in by
                hand for a day you forgot about.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => selectDate(addDays(selectedDate, -1))}
                className="inline-flex items-center gap-2 rounded-none border-[2px] border-black bg-white px-4 py-2 font-mono text-[12px] uppercase tracking-wide text-black shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-fofo-blue hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
                prev
              </button>

              <button
                type="button"
                onClick={() => selectDate(todayKey)}
                className="rounded-none border-[2px] border-black bg-black px-4 py-2 font-mono text-[12px] uppercase tracking-wide text-white shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-fofo-blue"
              >
                today
              </button>

              <button
                type="button"
                onClick={() => selectDate(addDays(selectedDate, 1))}
                className="inline-flex items-center gap-2 rounded-none border-[2px] border-black bg-white px-4 py-2 font-mono text-[12px] uppercase tracking-wide text-black shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-fofo-blue hover:text-white"
              >
                next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_11rem]">
            <label className="block">
              <span className="meta text-fofo-blue">Selected day</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => selectDate(event.target.value)}
                className="mt-2 w-full rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
              />
            </label>

            <div className="rounded-none border-[2.5px] border-black bg-black/[0.03] px-4 py-4">
              <p className="meta text-fofo-blue">Day total</p>
              <div className="mt-2 font-display font-bold lowercase text-3xl tracking-tight text-black">
                {formatDuration(selectedDayMinutes + (selectedDate === todayKey ? activeMinutes : 0))}
              </div>
            </div>

            <div className="rounded-none border-[2.5px] border-black bg-black/[0.03] px-4 py-4">
              <p className="meta text-fofo-blue">Week total</p>
              <div className="mt-2 font-display font-bold lowercase text-3xl tracking-tight text-black">
                {formatDuration(selectedWeekMinutes)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-none border-[2.5px] border-black bg-white p-4 shadow-brutal md:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {selectedWeekDays.map((day) => {
              const dateKey = toDateKey(day);
              const isActive = dateKey === selectedDate;
              const minutes = dailyTotals.get(dateKey) ?? 0;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectDate(dateKey)}
                  className={clsx(
                    "min-w-[118px] rounded-none border-[2px] px-4 py-3 text-left transition",
                    isActive
                      ? "border-black bg-fofo-blue text-white shadow-brutal"
                      : "border-black bg-white text-black shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal",
                  )}
                >
                  <p className={clsx("meta", isActive ? "text-white/75" : "text-fofo-blue")}>
                    {formatWeekday(dateKey)}
                  </p>
                  <p className="mt-2 text-sm font-medium">{formatMonthDay(dateKey)}</p>
                  <p className={clsx("mt-1 text-sm", isActive ? "text-white/80" : "text-black/55")}>
                    {minutes ? formatDuration(minutes) : "No blocks"}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-none border-[2.5px] border-black bg-white">
            <div className="border-b border-black/8 px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="meta text-fofo-blue">{formatWeekRange(selectedDate)}</p>
                  <h3 className="mt-1 font-display font-bold lowercase text-2xl tracking-tight text-black">
                    {formatDayLabel(selectedDate)}
                  </h3>
                </div>
                <p className="text-sm text-black/55">
                  one plane, one day. drag on the canvas to make time.
                </p>
              </div>
            </div>

            <div
              ref={timelineViewportRef}
              className="overflow-x-auto overflow-y-hidden pb-4"
            >
              <div className="min-w-max px-4 py-4" style={{ width: `${TIMELINE_WIDTH + 32}px` }}>
                <div className="relative mb-3 h-10" style={{ width: `${TIMELINE_WIDTH}px` }}>
                  {Array.from(
                    { length: (VISIBLE_END_MINUTE - VISIBLE_START_MINUTE) / 60 + 1 },
                    (_, index) => VISIBLE_START_MINUTE / 60 + index,
                  ).map((hour) => (
                    <div
                      key={hour}
                      className="absolute top-0 text-xs text-black/35"
                      style={{ left: `${minuteToX(hour * 60)}px`, transform: "translateX(-50%)" }}
                    >
                      {minutesToTime(hour * 60)}
                    </div>
                  ))}
                </div>

                <div
                  className="relative rounded-none border-[2.5px] border-black bg-black/[0.02]"
                  style={{ width: `${TIMELINE_WIDTH}px`, height: `${trackHeight}px` }}
                >
                  {Array.from(
                    { length: (VISIBLE_END_MINUTE - VISIBLE_START_MINUTE) / 60 + 1 },
                    (_, index) => VISIBLE_START_MINUTE / 60 + index,
                  ).map((hour) => (
                    <div
                      key={hour}
                      className="pointer-events-none absolute inset-y-0 border-l border-black"
                      style={{ left: `${minuteToX(hour * 60)}px` }}
                    />
                  ))}

                  {Array.from({ length: VISIBLE_SLOTS }, (_, slot) => (
                    <div
                      key={slot}
                      className="pointer-events-none absolute inset-y-0 border-l border-dashed border-black/[0.04]"
                      style={{ left: `${slot * SLOT_WIDTH}px` }}
                    />
                  ))}

                  {timelineRange ? (
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 rounded-none border border-fofo-blue bg-fofo-blue/14"
                      style={{
                        left: `${minuteToX(timelineRange.start)}px`,
                        width: `${minutesToWidth(timelineRange.end - timelineRange.start)}px`,
                      }}
                    />
                  ) : null}

                  {liveRange ? (
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 rounded-none border border-black bg-fofo-yellow/60"
                      style={{
                        left: `${minuteToX(liveRange.start)}px`,
                        width: `${Math.max(minutesToWidth(liveRange.end - liveRange.start), 8)}px`,
                      }}
                    />
                  ) : null}

                  {selectedDate === todayKey &&
                  currentMinute >= VISIBLE_START_MINUTE &&
                  currentMinute <= VISIBLE_END_MINUTE ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-red-400/80"
                      style={{
                        left: `${minuteToX(currentMinute)}px`,
                      }}
                    />
                  ) : null}

                  <div
                    className="absolute inset-0 cursor-crosshair"
                    onPointerDown={handleTimelinePointerDown}
                  />

                  {timeline.items.map((entry) => {
                    const left = minuteToX(entry.startMinute);
                    const width = Math.max(minutesToWidth(entry.endMinute - entry.startMinute), 48);
                    const top = TRACK_PADDING + entry.lane * LANE_HEIGHT;
                    const isCompact = width < 132;

                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => editEntry(entry)}
                        className={clsx(
                          "absolute z-20 h-11 overflow-visible rounded-none border px-0 py-0 text-left shadow-brutal-sm transition hover:z-30 hover:shadow-brutal",
                          editingId === entry.id
                            ? "border-black bg-black text-white"
                            : "border-black bg-white text-black",
                        )}
                        style={{ left: `${left}px`, top: `${top}px`, width: `${width}px` }}
                      >
                        <div
                          className={clsx(
                            "rounded-none border px-3 py-2 shadow-brutal-sm",
                            isCompact ? "min-w-[132px]" : "w-full",
                            editingId === entry.id
                              ? "border-black bg-black text-white"
                              : "border-black bg-white text-black",
                          )}
                        >
                          <p className="truncate text-sm font-semibold">{entry.project}</p>
                          <p
                            className={clsx(
                              "truncate text-xs",
                              editingId === entry.id ? "text-white/75" : "text-black/55",
                            )}
                          >
                            {entry.start} - {entry.end}
                          </p>
                          {entry.task ? (
                            <p
                              className={clsx(
                                "truncate text-[11px]",
                                editingId === entry.id ? "text-white/60" : "text-black/45",
                              )}
                            >
                              {entry.task}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <div className="rounded-none border-[2.5px] border-black bg-black px-5 py-5 text-white shadow-brutal">
          <p className="meta flex items-center gap-2 text-white/60">
            {activeSession && (
              <span
                aria-hidden
                className="inline-block h-2 w-2 animate-pulse bg-fofo-pink"
              />
            )}
            live timer
          </p>
          <div className="mt-2 font-display font-bold lowercase text-4xl tracking-tight">
            {activeSession ? formatDuration(activeMinutes) : "ready when you are"}
          </div>
          <p className="mt-2 text-sm text-white/65">
            {activeSession
              ? `${activeSession.project}${activeSession.task ? ` · ${activeSession.task}` : ""}`
              : "pick up where you left off, or spin up a fresh one below."}
          </p>

          <button
            type="button"
            onClick={activeSession ? stopTimer : startTimer}
            className={clsx(
              "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-none border-[2px] border-white px-5 py-3 font-mono text-[12px] uppercase tracking-wide transition hover:-translate-y-0.5",
              activeSession
                ? "bg-fofo-pink text-white"
                : "bg-white text-black hover:bg-fofo-blue hover:text-white",
            )}
          >
            {activeSession ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {activeSession ? "stop & save" : "start timer"}
          </button>
        </div>

        <div className="rounded-none border-[2.5px] border-black bg-white p-5 shadow-brutal">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="meta text-fofo-blue">BLOCK EDITOR</p>
              <h3 className="mt-1 font-display font-bold lowercase text-2xl tracking-tight text-black">
                {editingId ? "Edit block" : "Add block"}
              </h3>
            </div>
            {timelineRange ? (
              <div className="rounded-none border border-fofo-blue/25 bg-fofo-blue/10 px-3 py-1 text-sm text-fofo-blue">
                {minutesToTime(timelineRange.start)} - {minutesToTime(timelineRange.end)}
              </div>
            ) : null}
          </div>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="meta text-fofo-blue">Project</span>
              <input
                value={draft.project}
                onChange={(event) => updateDraft("project", event.target.value)}
                className="mt-2 w-full rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
                placeholder="Lutz"
              />
            </label>

            <label className="block">
              <span className="meta text-fofo-blue">Task</span>
              <input
                value={draft.task}
                onChange={(event) => updateDraft("task", event.target.value)}
                className="mt-2 w-full rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
                placeholder="Sync, coding, concept, support..."
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <label className="block">
                <span className="meta text-fofo-blue">Date</span>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) => {
                    updateDraft("date", event.target.value);
                    setSelectedDate(event.target.value);
                  }}
                  className="mt-2 w-full rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
                />
              </label>

              <label className="block">
                <span className="meta text-fofo-blue">Start</span>
                <input
                  type="time"
                  value={draft.start}
                  onChange={(event) => updateDraft("start", event.target.value)}
                  className="mt-2 w-full rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
                />
              </label>

              <label className="block">
                <span className="meta text-fofo-blue">End</span>
                <input
                  type="time"
                  value={draft.end}
                  onChange={(event) => updateDraft("end", event.target.value)}
                  className="mt-2 w-full rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
                />
              </label>
            </div>

            {recentProjects.length ? (
              <div>
                <p className="meta text-fofo-blue">Recent projects</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentProjects.map((project) => (
                    <button
                      key={project}
                      type="button"
                      onClick={() => updateDraft("project", project)}
                      className="rounded-none border-[2.5px] border-black bg-white px-3 py-1.5 text-sm text-black/65 transition hover:border-black hover:text-black"
                    >
                      {project}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveDraft}
                className="inline-flex items-center gap-2 rounded-none bg-fofo-blue px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5"
              >
                <PencilLine className="h-4 w-4" />
                {editingId ? "Update block" : "Save block"}
              </button>

              <button
                type="button"
                onClick={() => resetDraft()}
                className="rounded-none border-[2.5px] border-black bg-white px-5 py-3 text-sm text-black/70 transition hover:border-black hover:text-black"
              >
                Clear
              </button>
            </div>

            <div className="rounded-none border-[2.5px] border-black bg-black/[0.03] px-4 py-3 text-sm text-black/60">
              {timelineRange
                ? `Selection ready: ${minutesToTime(timelineRange.start)} - ${minutesToTime(timelineRange.end)}`
                : "Tip: drag left-to-right on the timeline to fill the time range."}
            </div>

            {message ? (
              <div className="rounded-none border-[2.5px] border-black bg-black/[0.03] px-4 py-3 text-sm text-black/65">
                {message}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-none border-[2.5px] border-black bg-white p-5 shadow-brutal">
          <div className="flex items-center gap-3">
            <TimerReset className="h-4 w-4 text-black/45" />
            <div>
              <p className="meta text-fofo-blue">CONTINUE</p>
              <h3 className="mt-1 font-display font-bold lowercase text-2xl tracking-tight text-black">
                Paused activities
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {recentActivities.length ? (
              recentActivities.map((activity) => (
                <div
                  key={`${activity.project}:${activity.task}`}
                  className="rounded-none border-[2.5px] border-black bg-white px-4 py-4"
                >
                  <p className="text-sm font-semibold text-black">{activity.project}</p>
                  <p className="mt-1 text-sm text-black/55">
                    {activity.task || "No task note"} · last on {formatMonthDay(activity.lastDate)}
                  </p>
                  <button
                    type="button"
                    onClick={() => resumeActivity(activity.project, activity.task)}
                    className="mt-3 inline-flex items-center gap-2 rounded-none border-[2.5px] border-black bg-white px-3 py-2 text-xs text-black/70 transition hover:border-black hover:text-black"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Continue
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-none border-[2px] border-dashed border-black bg-white px-4 py-8 text-center text-sm text-black/55">
                No previous activities to continue yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-none border-[2.5px] border-black bg-white p-5 shadow-brutal">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="meta text-fofo-blue">WEEK SUMMARY</p>
              <h3 className="mt-1 font-display font-bold lowercase text-2xl tracking-tight text-black">
                Booking-ready
              </h3>
            </div>
            <button
              type="button"
              onClick={copyWeekReport}
              className="inline-flex items-center gap-2 rounded-none border-[2.5px] border-black bg-white px-3 py-2 text-sm text-black/70 transition hover:border-black hover:text-black"
            >
              <Clipboard className="h-4 w-4" />
              {copyState === "copied"
                ? "Copied"
                : copyState === "error"
                  ? "Failed"
                  : "Copy"}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {weeklyProjectTotals.length ? (
              weeklyProjectTotals.map((project) => (
                <div
                  key={project.project}
                  className="flex items-center justify-between rounded-none border-[2.5px] border-black bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-black">
                      {project.project}
                    </p>
                  </div>
                  <span className="text-sm text-black/55">
                    {formatDuration(project.minutes)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-none border-[2px] border-dashed border-black bg-white px-4 py-8 text-center text-sm text-black/55">
                No hours in this week yet.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-none border-[2.5px] border-black bg-white p-5 shadow-brutal">
          <div className="flex items-center gap-3">
            <FolderKanban className="h-4 w-4 text-black/45" />
            <div>
              <p className="meta text-fofo-blue">DAY BLOCKS</p>
              <h3 className="mt-1 font-display font-bold lowercase text-2xl tracking-tight text-black">
                {formatDayLabel(selectedDate)}
              </h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {!hydrated ? (
              <div className="rounded-none border-[2.5px] border-black bg-white px-4 py-4 text-sm text-black/55">
                Loading local data...
              </div>
            ) : selectedDayEntries.length ? (
              selectedDayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-none border-[2.5px] border-black bg-white px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-black">{entry.project}</p>
                      <p className="mt-1 text-sm text-black/55">
                        {entry.start} - {entry.end} · {formatDuration(getDurationMinutes(entry))}
                      </p>
                      {entry.task ? (
                        <p className="mt-1 text-sm text-black/55">{entry.task}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => resumeActivity(entry.project, entry.task)}
                        className="inline-flex items-center gap-1 rounded-none border-[2.5px] border-black bg-white px-3 py-2 text-xs text-black/60 transition hover:border-black hover:text-black"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Continue
                      </button>
                      <button
                        type="button"
                        onClick={() => editEntry(entry)}
                        className="rounded-none border-[2.5px] border-black bg-white px-3 py-2 text-xs text-black/60 transition hover:border-black hover:text-black"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEntry(entry.id)}
                        className="inline-flex items-center gap-1 rounded-none border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 transition hover:border-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-none border-[2px] border-dashed border-black bg-white px-4 py-8 text-center text-sm text-black/55">
                No blocks on this day yet. Drag the timeline or add one manually.
              </div>
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
