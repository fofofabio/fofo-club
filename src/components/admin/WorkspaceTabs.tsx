"use client";

import { useState } from "react";
import clsx from "clsx";
import { Clock, ListTodo } from "lucide-react";

import HoursTracker from "./HoursTracker";
import TodoBoard from "./TodoBoard";

type Tab = "hours" | "todos";

type PendingDraft = { project: string; task: string } | null;

export default function WorkspaceTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("hours");
  const [pendingDraft, setPendingDraft] = useState<PendingDraft>(null);

  function handleStartTimer(project: string, task: string) {
    setPendingDraft({ project, task });
    setActiveTab("hours");
  }

  function handleDraftApplied() {
    setPendingDraft(null);
  }

  return (
    <div>
      <div className="mb-6 flex w-fit items-center gap-2 rounded-none border-[2.5px] border-black bg-white p-1.5 shadow-brutal-sm">
        <TabButton
          active={activeTab === "hours"}
          onClick={() => setActiveTab("hours")}
          icon={<Clock className="h-4 w-4" />}
          label="Hours"
        />
        <TabButton
          active={activeTab === "todos"}
          onClick={() => setActiveTab("todos")}
          icon={<ListTodo className="h-4 w-4" />}
          label="To-Do"
        />
      </div>

      {/* Both tabs stay mounted so state (active timer, todo list) is preserved */}
      <div className={activeTab === "hours" ? undefined : "hidden"}>
        <HoursTracker
          pendingDraft={pendingDraft}
          onPendingDraftApplied={handleDraftApplied}
        />
      </div>

      <div className={activeTab === "todos" ? undefined : "hidden"}>
        <TodoBoard onStartTimer={handleStartTimer} />
      </div>
    </div>
  );
}

function TabButton({
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
