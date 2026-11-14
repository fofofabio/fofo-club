"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import FinanceDashboard from "./FinanceDashboard";
import HoursTracker, { type TimerStripState } from "./HoursTracker";
import TodoBoard from "./TodoBoard";
import CyclingRoutes from "./CyclingRoutes";
import MoviesUpcoming from "./MoviesUpcoming";
import WowDesk from "./WowDesk";
import DailyCow from "@/components/DailyCow";
import { logoutAdminAction } from "@/app/workspace/actions";
import { WorkspaceAppearance, WorkspaceButton } from "./WorkspaceUI";

type WorkspaceView = "hours" | "tasks" | "finances" | "cycling" | "movies" | "wow";
const destinations: { id: WorkspaceView; label: string }[] = [
  { id: "hours", label: "Hours" }, { id: "tasks", label: "Tasks" },
  { id: "finances", label: "Finances" }, { id: "cycling", label: "Cycling" }, { id: "movies", label: "Cinema" },
  { id: "wow", label: "WoW" },
];

export default function WorkspaceDesk({ displayName, userId }: { displayName: string; userId: string }) {
  const [pendingDraft, setPendingDraft] = useState<{ project: string; task: string } | null>(null);
  const [view, setView] = useState<WorkspaceView>("hours");
  const [visited, setVisited] = useState<Set<WorkspaceView>>(() => new Set(["hours"]));
  const [timer, setTimer] = useState<TimerStripState | null>(null);
  const draftApplied = useCallback(() => setPendingDraft(null), []);

  useEffect(() => {
    const readView = () => {
      const raw = new URL(window.location.href).searchParams.get("view")?.toLowerCase() ?? null;
      // The tab says "Cinema" but the id is "movies": accept both.
      const candidate = raw === "cinema" ? "movies" : raw;
      const next = destinations.some((item) => item.id === candidate) ? candidate as WorkspaceView : "hours";
      setView(next);
      setVisited((current) => new Set(current).add(next));
    };
    readView();
    window.addEventListener("popstate", readView);
    return () => window.removeEventListener("popstate", readView);
  }, []);

  // Browser tab title: the current view, plus the running timer so it can be seen from other tabs.
  const timerRunning = Boolean(timer?.running);
  const timerElapsed = timer?.elapsed ?? "";
  useEffect(() => {
    const original = document.title;
    return () => { document.title = original; };
  }, []);
  useEffect(() => {
    const label = destinations.find((item) => item.id === view)?.label ?? "Workspace";
    document.title = `${timerRunning && timerElapsed ? `● ${timerElapsed} · ` : ""}${label} · Workspace | Fofo Club`;
  }, [view, timerRunning, timerElapsed]);

  // 1–6 switch views in nav order, unless something is being typed into.
  const navigateRef = useRef<(next: WorkspaceView) => void>(() => {});
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.repeat) return;
      const index = Number(event.key) - 1;
      if (!Number.isInteger(index) || index < 0 || index >= destinations.length) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], details[open]")) return;
      event.preventDefault();
      navigateRef.current(destinations[index].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function navigate(next: WorkspaceView) {
    if (next === view) return;
    setView(next);
    setVisited((current) => new Set(current).add(next));
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.pushState({}, "", url);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  navigateRef.current = navigate;

  return <>
    <header className="ws-topbar">
      <h1><span className="ws-wordmark">fofo</span><span>Workspace</span></h1>
      <nav aria-label="Workspace destinations">{destinations.map(({ id, label }, index) => <a key={id} href={`?view=${id}`} aria-keyshortcuts={String(index + 1)} title={`${label} (${index + 1})`} aria-current={view === id ? "page" : undefined} onClick={(event) => {
        if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); navigate(id);
      }}>{label}</a>)}</nav>
      <details className="ws-account"><summary>Account</summary><div><p>{displayName}</p><WorkspaceAppearance /><Link href="/">← Back to Fofo Club</Link><form action={logoutAdminAction}><WorkspaceButton type="submit">Sign out</WorkspaceButton></form></div></details>
    </header>
    <div className="ws-timer-strip" aria-label="Persistent timer">
      <span className={`ws-status ${timer?.running ? "" : "ws-status-idle"}`} aria-hidden="true" />
      <span className="ws-timer-context">{timer?.running ? `${timer.project}${timer.task ? ` · ${timer.task}` : ""}` : timer?.error ? "Timer unavailable — reload to retry" : timer ? "No timer running" : "Loading timer…"}</span>
      {timer?.running ? <><time className="ws-elapsed">{timer.elapsed}</time><WorkspaceButton primary disabled={timer.busy} onClick={timer.stop}>{timer.busy ? "Saving…" : "Stop & save"}</WorkspaceButton></> : null}
    </div>
    <main id="workspace-content" className="ws-page">
      <div hidden={view !== "hours"}>
        <div className="ws-cow-original"><DailyCow className="mb-8 max-w-3xl" /></div>
        <div className="ws-tool ws-hours"><HoursTracker pendingDraft={pendingDraft} onPendingDraftApplied={draftApplied} onTimerState={setTimer} /></div>
      </div>
      <div hidden={view !== "tasks"} className="ws-tool ws-tasks">{visited.has("tasks") ? <TodoBoard key={userId} userId={userId} onStartTimer={(project, task) => { setPendingDraft({ project, task }); navigate("hours"); }} /> : null}</div>
      <div hidden={view !== "finances"} className="ws-tool ws-finances">{visited.has("finances") ? <FinanceDashboard /> : null}</div>
      <div hidden={view !== "cycling"} className="ws-tool ws-cycling">{visited.has("cycling") ? <CyclingRoutes /> : null}</div>
      <div hidden={view !== "movies"} className="ws-tool ws-cinema">{visited.has("movies") ? <MoviesUpcoming /> : null}</div>
      <div hidden={view !== "wow"} className="ws-tool ws-wow">{visited.has("wow") ? <WowDesk /> : null}</div>
    </main>
  </>;
}
