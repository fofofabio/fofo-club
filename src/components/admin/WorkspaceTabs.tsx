"use client";

import { useState } from "react";
import clsx from "clsx";
import { Clock, ListTodo } from "lucide-react";

import HoursTracker from "./HoursTracker";
import TodoBoard from "./TodoBoard";

type Tab = "hours" | "todos";

export default function WorkspaceTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("hours");

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 rounded-2xl border border-black/10 bg-white/75 p-1.5 shadow-sm backdrop-blur w-fit">
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

      {activeTab === "hours" ? <HoursTracker /> : <TodoBoard />}
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
        "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition",
        active
          ? "bg-black text-white shadow-sm"
          : "text-black/55 hover:text-black",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
