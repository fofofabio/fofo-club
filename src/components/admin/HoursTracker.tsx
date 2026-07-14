"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Clipboard,
  PencilLine,
  Play,
  Square,
  TimerReset,
  Trash2,
} from "lucide-react";

import { projectColor } from "@/lib/projectColor";
import DateField from "./DateField";

const SLOT_MINUTES = 15;
const VISIBLE_START_MINUTE = 6 * 60;
const VISIBLE_END_MINUTE = 19 * 60;
const VISIBLE_MINUTES = VISIBLE_END_MINUTE - VISIBLE_START_MINUTE;
const VISIBLE_SLOTS = VISIBLE_MINUTES / SLOT_MINUTES;
const SLOT_WIDTH = 36;
const TIMELINE_WIDTH = VISIBLE_SLOTS * SLOT_WIDTH;
const LANE_HEIGHT = 76;
const TRACK_PADDING = 20;

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
  const [focusMinute, setFocusMinute] = useState<number | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

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
    if (!justSavedId) return;
    const timeout = window.setTimeout(() => setJustSavedId(null), 600);
    return () => window.clearTimeout(timeout);
  }, [justSavedId]);

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

  const hasContent = timeline.items.length > 0 || Boolean(liveRange);
  const trackHeight = hasContent
    ? Math.max(timeline.laneCount * LANE_HEIGHT + TRACK_PADDING * 2, 200)
    : 176;

  // Bring the populated part of the day into view instead of always starting at 06:00.
  useEffect(() => {
    if (!hydrated || dragState) {
      return;
    }

    const viewport = timelineViewportRef.current;
    if (!viewport) {
      return;
    }

    let targetMinute: number | null = null;

    if (timeline.items.length) {
      targetMinute = Math.min(...timeline.items.map((item) => item.startMinute));
    } else if (selectedDate === todayKey) {
      const now = new Date();
      const nowMinute = now.getHours() * 60 + now.getMinutes();
      if (nowMinute >= VISIBLE_START_MINUTE && nowMinute <= VISIBLE_END_MINUTE) {
        targetMinute = nowMinute;
      }
    }

    const left =
      targetMinute == null ? 0 : Math.max(0, minuteToX(targetMinute) - SLOT_WIDTH * 3);
    viewport.scrollTo({ left, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, selectedDate, timeline.items, todayKey]);

  // Scroll a freshly saved / stopped block into view, even if it isn't the earliest of the day.
  useEffect(() => {
    if (focusMinute == null) {
      return;
    }

    const viewport = timelineViewportRef.current;
    if (viewport) {
      const clamped = Math.max(VISIBLE_START_MINUTE, Math.min(focusMinute, VISIBLE_END_MINUTE));
      viewport.scrollTo({
        left: Math.max(0, minuteToX(clamped) - SLOT_WIDTH * 3),
        behavior: "smooth",
      });
    }

    setFocusMinute(null);
  }, [focusMinute]);

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
      setFocusMinute(timeToMinutes(payload.entry.start));
      setJustSavedId(payload.entry.id);
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
      setFocusMinute(timeToMinutes(payload.entry.start));
      setJustSavedId(payload.entry.id);
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
        <div className="flex flex-col gap-4 px-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="meta text-fofo-blue">HOURS TRACKER</p>
            <h2 className="mt-1 font-display font-bold lowercase text-3xl tracking-tight text-black md:text-4xl">
              Day timeline
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-6 text-black/55">
              drag across the day to carve out a block — or punch one in by hand.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className="relative">
              <p className="meta text-fofo-blue">Day</p>
              <div className="font-display font-bold lowercase text-3xl tracking-tight text-black">
                {formatDuration(selectedDayMinutes + (selectedDate === todayKey ? activeMinutes : 0))}
              </div>
              {selectedDayMinutes + (selectedDate === todayKey ? activeMinutes : 0) >= 360 ? (
                <span
                  aria-hidden
                  className="ws-stamp pointer-events-none absolute -right-8 -top-2 select-none border-[2.5px] border-fofo-pink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-tight text-fofo-pink"
                >
                  good day
                </span>
              ) : null}
            </div>

            <div>
              <p className="meta text-fofo-blue">Week</p>
              <div className="font-display font-bold lowercase text-3xl tracking-tight text-black/60">
                {formatDuration(selectedWeekMinutes)}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => selectDate(addDays(selectedDate, -1))}
                aria-label="Previous day"
                className="inline-flex items-center justify-center rounded-none border-[2px] border-black bg-white p-2 text-black transition hover:bg-fofo-blue hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => selectDate(todayKey)}
                className="rounded-none border-[2px] border-black bg-black px-3 py-2 font-mono text-[12px] uppercase tracking-wide text-white transition hover:bg-fofo-blue"
              >
                today
              </button>
              <button
                type="button"
                onClick={() => selectDate(addDays(selectedDate, 1))}
                aria-label="Next day"
                className="inline-flex items-center justify-center rounded-none border-[2px] border-black bg-white p-2 text-black transition hover:bg-fofo-blue hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-none border-[2.5px] border-black bg-white p-4 shadow-brutal md:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {selectedWeekDays.map((day) => {
              const dateKey = toDateKey(day);
              const isActive = dateKey === selectedDate;
              const minutes = dailyTotals.get(dateKey) ?? 0;
              const hasBlocks = minutes > 0;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => selectDate(dateKey)}
                  className={clsx(
                    "rounded-none px-3 py-3 text-left transition",
                    isActive
                      ? "min-w-[118px] border-[2px] border-black bg-fofo-blue text-white shadow-brutal"
                      : hasBlocks
                        ? "min-w-[118px] border-[2px] border-black bg-white text-black shadow-brutal-sm hover:-translate-y-0.5 hover:shadow-brutal"
                        : "min-w-[92px] border border-black/15 bg-transparent text-black/60 hover:border-black/40",
                  )}
                >
                  <p className={clsx("meta", isActive ? "text-white/75" : "text-fofo-blue")}>
                    {formatWeekday(dateKey)}
                  </p>
                  <p className="mt-2 text-sm font-medium">{formatMonthDay(dateKey)}</p>
                  <p
                    className={clsx(
                      "mt-1 text-sm",
                      isActive ? "text-white/80" : hasBlocks ? "text-black/70" : "text-black/35",
                    )}
                  >
                    {minutes ? formatDuration(minutes) : "—"}
                  </p>
                  <div
                    className={clsx(
                      "mt-2 h-1.5 w-full overflow-hidden rounded-none",
                      isActive ? "bg-white/25" : "bg-black/10",
                    )}
                  >
                    <div
                      className={clsx("h-full rounded-none transition-all duration-500", isActive ? "bg-fofo-yellow" : "bg-fofo-blue")}
                      style={{ width: `${Math.min(100, Math.round((minutes / 480) * 100))}%` }}
                    />
                  </div>
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
                <p className="text-sm text-black/70">
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
                      className="pointer-events-none absolute inset-y-0 z-10"
                      style={{ left: `${minuteToX(currentMinute)}px` }}
                    >
                      <div className="absolute inset-y-0 -left-px w-[2px] bg-red-500/80" />
                      <div className="ws-now-tick absolute -left-[5px] -top-[5px] h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
                      <span className="absolute -top-[5px] left-2.5 font-mono text-[9px] font-bold uppercase tracking-tight text-red-500">
                        now
                      </span>
                    </div>
                  ) : null}

                  <div
                    className="absolute inset-0 cursor-crosshair"
                    onPointerDown={handleTimelinePointerDown}
                  />

                  {hydrated && !hasContent && !timelineRange ? (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <span className="font-hand text-2xl leading-none text-fofo-blue/70">
                        {selectedDate === todayKey
                          ? "blank page. carve your first block →"
                          : "nothing here yet — drag to fill it in"}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/30">
                        drag left-to-right across the day
                      </span>
                    </div>
                  ) : null}

                  {timeline.items.map((entry) => {
                    const left = minuteToX(entry.startMinute);
                    const width = Math.max(minutesToWidth(entry.endMinute - entry.startMinute), 52);
                    const top = TRACK_PADDING + entry.lane * LANE_HEIGHT;
                    const isCompact = width < 132;
                    const isEditing = editingId === entry.id;
                    const ink = projectColor(entry.project);
                    const durationMin = entry.endMinute - entry.startMinute;

                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => editEntry(entry)}
                        className={clsx(
                          "group absolute z-20 overflow-hidden rounded-none border-[2.5px] text-left shadow-brutal-sm transition hover:z-30 hover:-translate-y-0.5 hover:shadow-brutal",
                          justSavedId === entry.id && "ws-block-in",
                          isEditing ? "border-black" : "border-black",
                        )}
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${width}px`,
                          height: `${LANE_HEIGHT - 12}px`,
                          background: isEditing ? "#000" : ink.wash,
                          color: isEditing ? "#fff" : "#000",
                        }}
                      >
                        {/* Project ink spine */}
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-[6px]"
                          style={{ background: isEditing ? ink.ink : ink.ink }}
                        />
                        <div className={clsx("h-full px-3 py-2", isCompact ? "pl-3" : "pl-4")}>
                          <p
                            className="truncate text-sm font-bold leading-tight"
                            style={{ color: isEditing ? "#fff" : ink.text }}
                          >
                            {entry.project}
                          </p>
                          <p
                            className={clsx(
                              "truncate font-mono text-[11px] leading-tight tracking-tight",
                              isEditing ? "text-white/70" : "text-black/55",
                            )}
                          >
                            {entry.start}–{entry.end} · {formatDuration(durationMin)}
                          </p>
                          {entry.task && !isCompact ? (
                            <p
                              className={clsx(
                                "truncate text-[11px] leading-tight",
                                isEditing ? "text-white/60" : "text-black/50",
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
        {/* Reference material under the canvas. Each block only renders when it
            has content, so a blank day stays blank instead of showing empty
            panels. Paused activities is a short horizontal strip so it fills the
            width instead of forming a tall narrow column. */}
        {recentActivities.length > 0 ? (
          <div className="rounded-none border border-black/12 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <TimerReset className="h-4 w-4 text-black/45" />
              <p className="meta text-fofo-blue">CONTINUE</p>
              <h3 className="font-display font-bold lowercase text-lg tracking-tight text-black">
                paused activities
              </h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recentActivities.map((activity) => (
                <div
                  key={`${activity.project}:${activity.task}`}
                  className="flex w-52 shrink-0 flex-col rounded-none border border-black/15 bg-white p-3"
                  style={{ borderLeft: `5px solid ${projectColor(activity.project).ink}` }}
                >
                  <p className="truncate text-sm font-semibold text-black">{activity.project}</p>
                  <p className="mt-0.5 truncate text-xs text-black/55">
                    {activity.task || "no task note"} · {formatMonthDay(activity.lastDate)}
                  </p>
                  <button
                    type="button"
                    onClick={() => resumeActivity(activity.project, activity.task)}
                    className="mt-2 inline-flex items-center gap-1.5 self-start rounded-none border-[2px] border-black bg-white px-2.5 py-1 text-xs text-black/70 transition hover:bg-fofo-blue hover:text-white"
                  >
                    <Play className="h-3 w-3" />
                    continue
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {weeklyProjectTotals.length > 0 ? (
          <div className="rounded-none border border-black/12 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="meta text-fofo-blue">WEEK SUMMARY</p>
                <h3 className="font-display font-bold lowercase text-lg tracking-tight text-black">
                  booking-ready
                </h3>
              </div>
              <button
                type="button"
                onClick={copyWeekReport}
                className="inline-flex items-center gap-2 rounded-none border-[2px] border-black bg-white px-3 py-1.5 text-sm text-black/70 transition hover:bg-fofo-blue hover:text-white"
              >
                <Clipboard className="h-4 w-4" />
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "error"
                    ? "Failed"
                    : "Copy"}
              </button>
            </div>

            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {weeklyProjectTotals.map((project) => {
                const ink = projectColor(project.project);
                const topMinutes = weeklyProjectTotals[0]?.minutes || 1;
                const pct = Math.max(6, Math.round((project.minutes / topMinutes) * 100));
                return (
                  <div key={project.project}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: ink.ink }}
                        />
                        <p className="truncate text-sm font-medium text-black">
                          {project.project || "No project"}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm text-black/70">
                        {formatDuration(project.minutes)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-none bg-black/8">
                      <div
                        className="h-full rounded-none transition-all duration-500"
                        style={{ width: `${pct}%`, background: ink.ink }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <div className="rounded-none border-[2.5px] border-black bg-black px-5 py-5 text-white shadow-brutal">
          <p className="meta flex items-center gap-2 text-white/60">
            {activeSession && (
              <span
                aria-hidden
                className="ws-live-pulse inline-block h-2 w-2 rounded-full bg-fofo-pink"
              />
            )}
            live timer
          </p>
          <div
            className={clsx(
              "mt-2 font-display font-bold lowercase tracking-tight",
              activeSession ? "text-4xl" : "text-xl text-white/70",
            )}
          >
            {activeSession ? formatDuration(activeMinutes) : "ready when you are"}
          </div>
          <p className="mt-1.5 text-sm text-white/60">
            {activeSession
              ? `${activeSession.project}${activeSession.task ? ` · ${activeSession.task}` : ""}`
              : "pick up where you left off, or spin up a fresh one below."}
          </p>

          <button
            type="button"
            onClick={activeSession ? stopTimer : startTimer}
            className={clsx(
              "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-none border-[2.5px] border-white px-5 py-4 text-sm font-bold uppercase tracking-wide shadow-brutal-sm transition hover:-translate-y-0.5",
              activeSession
                ? "bg-fofo-pink text-white"
                : "bg-fofo-blue text-white hover:bg-white hover:text-black",
            )}
          >
            {activeSession ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {activeSession ? "stop & save" : "start timer"}
          </button>
        </div>

        <div className="rounded-none border border-black/12 bg-white p-4">
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
              <span className="text-xs font-medium text-black/60">Project</span>
              <input
                value={draft.project}
                onChange={(event) => updateDraft("project", event.target.value)}
                className="mt-2 w-full rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
                placeholder="Lutz"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-black/60">Task</span>
              <input
                value={draft.task}
                onChange={(event) => updateDraft("task", event.target.value)}
                className="mt-2 w-full rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
                placeholder="Sync, coding, concept, support..."
              />
            </label>

            <details className="group border border-black/15 bg-black/[0.015] px-3 py-2" open={Boolean(editingId)}>
              <summary className="cursor-pointer list-none text-xs font-medium text-black/60 marker:content-none">
                <span className="group-open:hidden">＋ enter date &amp; time manually</span>
                <span className="hidden group-open:inline">－ date &amp; time</span>
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <label className="block">
                <span className="text-xs font-medium text-black/60">Date</span>
                <DateField
                  value={draft.date}
                  onChange={(value) => {
                    if (!value) return;
                    updateDraft("date", value);
                    setSelectedDate(value);
                  }}
                  placeholder="pick a date"
                  className="mt-2 flex w-full !py-3"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-black/60">Start</span>
                <input
                  type="time"
                  value={draft.start}
                  onChange={(event) => updateDraft("start", event.target.value)}
                  className="mt-2 w-full rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-black/60">End</span>
                <input
                  type="time"
                  value={draft.end}
                  onChange={(event) => updateDraft("end", event.target.value)}
                  className="mt-2 w-full rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
                />
              </label>
              </div>
            </details>

            {recentProjects.length ? (
              <div>
                <p className="meta text-fofo-blue">Recent projects</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {recentProjects.map((project) => {
                    const ink = projectColor(project);
                    return (
                      <button
                        key={project}
                        type="button"
                        onClick={() => updateDraft("project", project)}
                        className="flex items-center gap-2 truncate rounded-none border border-black/20 bg-white px-3 py-2 text-left text-sm text-black/70 transition hover:border-black hover:bg-black/[0.03] hover:text-black"
                      >
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: ink.ink }}
                        />
                        <span className="truncate">{project}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveDraft}
                className="inline-flex items-center gap-2 rounded-none border-[2.5px] border-black bg-fofo-blue px-5 py-3 text-sm font-bold text-white shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-black"
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

              {editingId ? (
                <button
                  type="button"
                  onClick={() => deleteEntry(editingId)}
                  className="inline-flex items-center gap-1.5 rounded-none border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 transition hover:border-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              ) : null}
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

      </aside>
    </section>
  );
}
