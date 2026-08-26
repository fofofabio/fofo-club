"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Clock, ListTodo, WalletCards } from "lucide-react";

import FinanceDashboard from "./FinanceDashboard";
import HoursTracker from "./HoursTracker";
import TodoBoard from "./TodoBoard";
import DailyCow from "@/components/DailyCow";

type PendingDraft = { project: string; task: string } | null;

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default function WorkspaceDesk() {
  const [pendingDraft, setPendingDraft] = useState<PendingDraft>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [active, setActive] = useState<"hours" | "tasks">("hours");
  const [view, setView] = useState<"work" | "finances">("work");

  const hoursRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);

  // Live clock in the desk rail — a small "now" presence shared across the page.
  useEffect(() => {
    if (view !== "work") return;

    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [view]);

  // Track which zone is in view so the jump-bar highlights the current one.
  useEffect(() => {
    const sections = [
      { id: "hours" as const, el: hoursRef.current },
      { id: "tasks" as const, el: tasksRef.current },
    ].filter((s) => s.el);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActive(visible.target === tasksRef.current ? "tasks" : "hours");
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5] },
    );

    sections.forEach((s) => s.el && observer.observe(s.el));
    return () => observer.disconnect();
  }, []);

  function jumpTo(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openWorkZone(zone: "hours" | "tasks") {
    setView("work");
    setActive(zone);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => jumpTo(zone === "hours" ? hoursRef : tasksRef));
    });
  }

  // Task → timer handoff. Both zones are always mounted now, so instead of
  // flipping a tab we prefill the block editor and glide up to the canvas.
  function handleStartTimer(project: string, task: string) {
    setPendingDraft({ project, task });
    jumpTo(hoursRef);
  }

  function handleDraftApplied() {
    setPendingDraft(null);
  }

  return (
    <div>
      {/* Sticky desk rail — Hours and Tasks share the work surface; Finances
          opens a focused private ledger without leaving the workspace. */}
      <div className="sticky top-3 z-30 mb-6 flex flex-wrap items-center gap-2 border-[2.5px] border-black bg-white/95 p-1.5 shadow-brutal-sm backdrop-blur">
        <JumpButton
          active={view === "work" && active === "hours"}
          onClick={() => openWorkZone("hours")}
          icon={<Clock className="h-4 w-4" />}
          label="Hours"
        />
        <JumpButton
          active={view === "work" && active === "tasks"}
          onClick={() => openWorkZone("tasks")}
          icon={<ListTodo className="h-4 w-4" />}
          label="Tasks"
        />
        <JumpButton
          active={view === "finances"}
          onClick={() => setView("finances")}
          icon={<WalletCards className="h-4 w-4" />}
          label="Finances"
        />

        <div className="ml-auto flex items-center gap-2 pr-2">
          <span
            aria-hidden
            className="ws-now-tick h-2 w-2 rounded-full bg-fofo-blue"
          />
          <span className="font-mono text-[13px] font-bold tracking-tight text-black tabular-nums">
            {now ? formatClock(now) : "--:--"}
          </span>
        </div>
      </div>

      {view === "work" ? (
        <>
          {/* A daily dose of cow before the work begins. */}
          <DailyCow className="mb-8 max-w-3xl" />

          {/* Zone 1 — the canvas: what am I doing right now. */}
          <section ref={hoursRef} className="scroll-mt-20">
            <div className="mb-3 flex items-center gap-2">
              <span className="meta text-fofo-blue">{"// zone: hours"}</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>
            <HoursTracker
              pendingDraft={pendingDraft}
              onPendingDraftApplied={handleDraftApplied}
            />
          </section>

          {/* Zone 2 — the list: what's on my plate. */}
          <section ref={tasksRef} className="mt-10 scroll-mt-20">
            <div className="mb-3 flex items-center gap-2">
              <span className="meta text-fofo-blue">{"// zone: tasks"}</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>
            <TodoBoard onStartTimer={handleStartTimer} />
          </section>
        </>
      ) : (
        <section className="scroll-mt-20">
          <div className="mb-3 flex items-center gap-2">
            <span className="meta text-fofo-blue">{"// zone: finances"}</span>
            <span className="h-px flex-1 bg-black/10" />
          </div>
          <FinanceDashboard />
        </section>
      )}
    </div>
  );
}

function JumpButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-2 rounded-none border-b-[3px] px-5 py-2.5 font-mono text-[12px] font-semibold uppercase tracking-wide transition",
        active
          ? "border-fofo-blue bg-fofo-blue text-white"
          : "border-transparent text-black/55 hover:text-black",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
