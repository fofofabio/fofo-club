"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import FinanceDashboard from "./FinanceDashboard";
import HoursTracker, { type TimerStripState } from "./HoursTracker";
import TodoBoard from "./TodoBoard";
import CyclingRoutes from "./CyclingRoutes";
import MoviesUpcoming from "./MoviesUpcoming";
import DailyCow from "@/components/DailyCow";
import { logoutAdminAction } from "@/app/workspace/actions";
import { WorkspaceAppearance, WorkspaceButton } from "./WorkspaceUI";

type WorkspaceView = "hours" | "tasks" | "finances" | "cycling" | "movies";
const destinations: { id: WorkspaceView; label: string }[] = [
  { id: "hours", label: "Hours" }, { id: "tasks", label: "Tasks" },
  { id: "finances", label: "Finances" }, { id: "cycling", label: "Cycling" }, { id: "movies", label: "Cinema" },
];

export default function WorkspaceDesk({ displayName }: { displayName: string }) {
  const [pendingDraft, setPendingDraft] = useState<{ project: string; task: string } | null>(null);
  const [view, setView] = useState<WorkspaceView>("hours");
  const [visited, setVisited] = useState<Set<WorkspaceView>>(() => new Set(["hours"]));
  const [timer, setTimer] = useState<TimerStripState | null>(null);
  const draftApplied = useCallback(() => setPendingDraft(null), []);

  useEffect(() => {
    const readView = () => {
      const candidate = new URL(window.location.href).searchParams.get("view");
      const next = destinations.some((item) => item.id === candidate) ? candidate as WorkspaceView : "hours";
      setView(next);
      setVisited((current) => new Set(current).add(next));
    };
    readView();
    window.addEventListener("popstate", readView);
    return () => window.removeEventListener("popstate", readView);
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

  return <>
    <header className="ws-topbar">
      <h1><span className="ws-wordmark">fofo</span><span>Workspace</span></h1>
      <nav aria-label="Workspace destinations">{destinations.map(({ id, label }) => <a key={id} href={`?view=${id}`} aria-current={view === id ? "page" : undefined} onClick={(event) => {
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
      <div hidden={view !== "tasks"} className="ws-tool ws-tasks">{visited.has("tasks") ? <TodoBoard onStartTimer={(project, task) => { setPendingDraft({ project, task }); navigate("hours"); }} /> : null}</div>
      <div hidden={view !== "finances"} className="ws-tool ws-finances">{visited.has("finances") ? <FinanceDashboard /> : null}</div>
      <div hidden={view !== "cycling"} className="ws-tool ws-cycling">{visited.has("cycling") ? <CyclingRoutes /> : null}</div>
      <div hidden={view !== "movies"} className="ws-tool ws-cinema">{visited.has("movies") ? <MoviesUpcoming /> : null}</div>
    </main>
  </>;
}
