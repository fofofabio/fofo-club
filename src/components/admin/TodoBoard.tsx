"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";
import DailyBriefCard from "./DailyBriefCard";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ListTodo,
  Play,
  Plus,
  Star,
  Trash2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Subtask = {
  id: string;
  text: string;
  done: boolean;
  sortOrder: number;
};

type Todo = {
  id: string;
  text: string;
  project: string;
  done: boolean;
  pinned: boolean;
  dueDate: string | null;
  notes: string;
  sortOrder: number;
  createdAt: string;
  doneAt: string | null;
  subtasks: Subtask[];
};

type PendingDelete = {
  todo: Todo;
  timeoutId: ReturnType<typeof setTimeout>;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Request failed.");
  }

  return res.json() as Promise<T>;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isOverdue(dueDate: string | null, done: boolean) {
  if (!dueDate || done) return false;
  return dueDate < todayKey();
}

function isDueToday(dueDate: string | null, done: boolean) {
  if (!dueDate || done) return false;
  return dueDate === todayKey();
}

function formatDueDate(dueDate: string) {
  const today = todayKey();

  if (dueDate === today) return "Today";

  const tomorrow = (() => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  if (dueDate === tomorrow) return "Tomorrow";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dueDate}T12:00:00`));
}

const ARCHIVE_DAYS = 7;

function getAgingStyle(createdAt: string, done: boolean): CSSProperties {
  if (done) return {};
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 7) return {};
  if (days < 14) return { filter: "saturate(0.75) brightness(0.97)" };
  if (days < 21) return { filter: "saturate(0.55) brightness(0.94) sepia(0.08)" };
  return { filter: "saturate(0.35) brightness(0.90) sepia(0.14)", opacity: 0.82 };
}

function isArchived(todo: Todo) {
  if (!todo.done || !todo.doneAt) return false;
  const doneMs = new Date(todo.doneAt).getTime();
  return Date.now() - doneMs > ARCHIVE_DAYS * 24 * 60 * 60 * 1000;
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  onStartTimer: (project: string, task: string) => void;
};

export default function TodoBoard({ onStartTimer }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Quick-add
  const [draftText, setDraftText] = useState("");
  const [draftProject, setDraftProject] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [activeFilter, setActiveFilter] = useState("all");
  const [showArchive, setShowArchive] = useState(false);

  // Row expand state
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());

  // Drag state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Undo delete toasts
  const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([]);

  // Load
  useEffect(() => {
    requestJson<{ todos: Todo[] }>("/api/workspace/todos")
      .then((p) => { setTodos(p.todos); setHydrated(true); })
      .catch(() => setHydrated(true));
  }, []);

  // Keyboard shortcut: T focuses the add input
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "t" && e.key !== "T") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      addInputRef.current?.focus();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const projects = Array.from(new Set(todos.map((t) => t.project).filter(Boolean))).sort();

  const activeTodos = todos.filter((t) => !isArchived(t));
  const archivedTodos = todos.filter(isArchived);

  const filtered = activeTodos.filter((t) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "done") return t.done;
    return t.project === activeFilter;
  });

  const pending = filtered.filter((t) => !t.done);
  const done = filtered.filter((t) => t.done);

  const pendingCount = activeTodos.filter((t) => !t.done).length;
  const doneCount = activeTodos.filter((t) => t.done).length;
  const totalCount = pendingCount + doneCount;

  // ─── Quick-add ─────────────────────────────────────────────────────────────

  async function addTodo() {
    const text = draftText.trim();
    if (!text) return;

    try {
      const payload = await requestJson<{ todo: Todo }>("/api/workspace/todos", {
        method: "POST",
        body: JSON.stringify({ text, project: draftProject, dueDate: draftDueDate || undefined }),
      });

      setTodos((prev) => [payload.todo, ...prev]);
      setDraftText("");
      setDraftDueDate("");
    } catch {
      // ignore
    }
  }

  // ─── Toggle done ───────────────────────────────────────────────────────────

  async function toggleDone(todo: Todo) {
    const next = !todo.done;
    const nextDoneAt = next ? new Date().toISOString() : null;

    setTodos((prev) =>
      prev.map((t) => t.id === todo.id ? { ...t, done: next, doneAt: nextDoneAt } : t),
    );

    try {
      const payload = await requestJson<{ todo: Todo }>(`/api/workspace/todos/${todo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: next }),
      });
      setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, doneAt: payload.todo.doneAt } : t));
    } catch {
      setTodos((prev) =>
        prev.map((t) => t.id === todo.id ? { ...t, done: todo.done, doneAt: todo.doneAt } : t),
      );
    }
  }

  // ─── Toggle pinned ─────────────────────────────────────────────────────────

  async function togglePinned(todo: Todo) {
    const next = !todo.pinned;
    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, pinned: next } : t));

    try {
      await requestJson(`/api/workspace/todos/${todo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pinned: next }),
      });
    } catch {
      setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, pinned: todo.pinned } : t));
    }
  }

  // ─── Update text ───────────────────────────────────────────────────────────

  async function updateText(todo: Todo, text: string) {
    const trimmed = text.trim();
    if (!trimmed || trimmed === todo.text) return;

    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, text: trimmed } : t));

    try {
      await requestJson(`/api/workspace/todos/${todo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ text: trimmed }),
      });
    } catch {
      setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, text: todo.text } : t));
    }
  }

  // ─── Update notes ──────────────────────────────────────────────────────────

  async function updateNotes(todo: Todo, notes: string) {
    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, notes } : t));

    try {
      await requestJson(`/api/workspace/todos/${todo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      });
    } catch {
      setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, notes: todo.notes } : t));
    }
  }

  // ─── Update due date ───────────────────────────────────────────────────────

  async function updateDueDate(todo: Todo, dueDate: string | null) {
    setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, dueDate } : t));

    try {
      await requestJson(`/api/workspace/todos/${todo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ dueDate }),
      });
    } catch {
      setTodos((prev) => prev.map((t) => t.id === todo.id ? { ...t, dueDate: todo.dueDate } : t));
    }
  }

  // ─── Delete with undo ──────────────────────────────────────────────────────

  function deleteTodo(todoId: string) {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    setTodos((prev) => prev.filter((t) => t.id !== todoId));

    const timeoutId = setTimeout(async () => {
      setPendingDeletes((prev) => prev.filter((p) => p.todo.id !== todoId));
      try {
        await requestJson(`/api/workspace/todos/${todoId}`, { method: "DELETE" });
      } catch {
        setTodos((prev) => [...prev, todo].sort((a, b) => a.sortOrder - b.sortOrder));
      }
    }, 5000);

    setPendingDeletes((prev) => [...prev, { todo, timeoutId }]);
  }

  function undoDelete(todoId: string) {
    const pending = pendingDeletes.find((p) => p.todo.id === todoId);
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    setPendingDeletes((prev) => prev.filter((p) => p.todo.id !== todoId));
    setTodos((prev) => [...prev, pending.todo].sort((a, b) => a.sortOrder - b.sortOrder));
  }

  // ─── Clear completed ───────────────────────────────────────────────────────

  async function clearCompleted() {
    const completed = todos.filter((t) => t.done);
    setTodos((prev) => prev.filter((t) => !t.done));

    try {
      await requestJson("/api/workspace/todos", { method: "DELETE" });
    } catch {
      setTodos((prev) => [...prev, ...completed].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  }

  // ─── Subtasks ──────────────────────────────────────────────────────────────

  async function addSubtask(todoId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      const payload = await requestJson<{ subtask: Subtask }>(
        `/api/workspace/todos/${todoId}/subtasks`,
        { method: "POST", body: JSON.stringify({ text: trimmed }) },
      );

      setTodos((prev) =>
        prev.map((t) =>
          t.id === todoId ? { ...t, subtasks: [...t.subtasks, payload.subtask] } : t,
        ),
      );
    } catch {
      // ignore
    }
  }

  async function toggleSubtask(todoId: string, subtask: Subtask) {
    const next = !subtask.done;

    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId
          ? { ...t, subtasks: t.subtasks.map((s) => s.id === subtask.id ? { ...s, done: next } : s) }
          : t,
      ),
    );

    try {
      await requestJson(`/api/workspace/todos/${todoId}/subtasks/${subtask.id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: next }),
      });
    } catch {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todoId
            ? { ...t, subtasks: t.subtasks.map((s) => s.id === subtask.id ? { ...s, done: subtask.done } : s) }
            : t,
        ),
      );
    }
  }

  async function deleteSubtask(todoId: string, subtaskId: string) {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === todoId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subtaskId) } : t,
      ),
    );

    try {
      await requestJson(`/api/workspace/todos/${todoId}/subtasks/${subtaskId}`, {
        method: "DELETE",
      });
    } catch {
      // ignore
    }
  }

  // ─── Drag to reorder ───────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, todoId: string) {
    setDraggedId(todoId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, todoId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (todoId !== dragOverId) setDragOverId(todoId);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const reordered = [...todos];
    const fromIdx = reordered.findIndex((t) => t.id === draggedId);
    const toIdx = reordered.findIndex((t) => t.id === targetId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withOrder = reordered.map((t, i) => ({ ...t, sortOrder: i }));

    setTodos(withOrder);
    setDraggedId(null);
    setDragOverId(null);

    requestJson("/api/workspace/todos", {
      method: "PUT",
      body: JSON.stringify({ order: withOrder.map((t) => t.id) }),
    }).catch(() => setTodos(todos));
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }

  // ─── Toggle helpers ────────────────────────────────────────────────────────

  function toggleExpand(set: Set<string>, id: string, setter: (v: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Main column */}
      <div className="min-w-0 space-y-4">
        {hydrated && <DailyBriefCard todos={todos} />}
        {/* Quick-add */}
        <div className="rounded-none border-[2.5px] border-black bg-white p-4 shadow-brutal md:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-none border-[2.5px] border-black bg-black/[0.03]">
              <ListTodo className="h-4 w-4 text-black/50" />
            </div>
            <div>
              <p className="meta text-fofo-blue">TO-DO</p>
              <h2 className="mt-0.5 font-display font-bold lowercase text-3xl tracking-tight text-black md:text-4xl">
                Tasks
              </h2>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="relative min-w-0 flex-1">
              <input
                ref={addInputRef}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addTodo(); }}
                placeholder="Add a task and press Enter… (press T to focus)"
                className="w-full rounded-none border-[2.5px] border-black bg-white px-4 py-3 pr-12 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
              />
              <button
                type="button"
                onClick={addTodo}
                disabled={!draftText.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-none bg-fofo-blue text-white transition hover:scale-105 disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <input
              value={draftProject}
              onChange={(e) => setDraftProject(e.target.value)}
              placeholder="Project"
              className="w-36 shrink-0 rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
            />

            <input
              type="date"
              value={draftDueDate}
              min="2000-01-01"
              max="2099-12-31"
              onChange={(e) => {
                const year = parseInt(e.target.value.split("-")[0] ?? "0", 10);
                if (!e.target.value || (year >= 2000 && year <= 2099)) {
                  setDraftDueDate(e.target.value);
                }
              }}
              className="w-40 shrink-0 rounded-none border-[2.5px] border-black bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
            />
          </div>
        </div>

        {/* Filters + list */}
        <div className="rounded-none border-[2.5px] border-black bg-white p-4 shadow-brutal md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", ...projects] as string[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={clsx(
                  "rounded-none border px-3 py-1.5 text-sm transition",
                  activeFilter === f
                    ? "border-fofo-blue bg-fofo-blue text-white"
                    : "border-black bg-white text-black/65 hover:border-black hover:text-black",
                )}
              >
                {f === "all" ? "All projects" : f}
              </button>
            ))}

            {doneCount > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="rounded-none border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700 transition hover:border-red-300"
                >
                  Clear completed
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {!hydrated ? (
              <div className="rounded-none border-[2.5px] border-black bg-white px-4 py-4 text-sm text-black/55">
                Loading…
              </div>
            ) : pending.length === 0 && done.length === 0 ? (
              <div className="rounded-none border-[2px] border-dashed border-black bg-white px-4 py-10 text-center text-sm text-black/55">
                No tasks yet. Add one above or press <kbd className="rounded border-[2.5px] border-black bg-black/5 px-1.5 py-0.5 font-mono text-xs">T</kbd>
              </div>
            ) : (
              <>
                {pending.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    isDragging={draggedId === todo.id}
                    isDragOver={dragOverId === todo.id}
                    notesOpen={expandedNotes.has(todo.id)}
                    subtasksOpen={expandedSubtasks.has(todo.id)}
                    onToggleDone={() => toggleDone(todo)}
                    onTogglePinned={() => togglePinned(todo)}
                    onUpdateText={(text) => updateText(todo, text)}
                    onUpdateNotes={(notes) => updateNotes(todo, notes)}
                    onUpdateDueDate={(d) => updateDueDate(todo, d)}
                    onDelete={() => deleteTodo(todo.id)}
                    onStartTimer={() => onStartTimer(todo.project, todo.text)}
                    onToggleNotes={() => toggleExpand(expandedNotes, todo.id, setExpandedNotes)}
                    onToggleSubtasks={() => toggleExpand(expandedSubtasks, todo.id, setExpandedSubtasks)}
                    onAddSubtask={(text) => addSubtask(todo.id, text)}
                    onToggleSubtask={(s) => toggleSubtask(todo.id, s)}
                    onDeleteSubtask={(sid) => deleteSubtask(todo.id, sid)}
                    onDragStart={(e) => handleDragStart(e, todo.id)}
                    onDragOver={(e) => handleDragOver(e, todo.id)}
                    onDrop={(e) => handleDrop(e, todo.id)}
                    onDragEnd={handleDragEnd}
                  />
                ))}

                {done.length > 0 && pending.length > 0 && (
                  <div className="flex items-center gap-3 px-1 py-2">
                    <div className="h-px flex-1 bg-black/10" />
                    <span className="text-xs text-black/40">Completed</span>
                    <div className="h-px flex-1 bg-black/10" />
                  </div>
                )}

                {done.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    isDragging={false}
                    isDragOver={false}
                    notesOpen={expandedNotes.has(todo.id)}
                    subtasksOpen={expandedSubtasks.has(todo.id)}
                    onToggleDone={() => toggleDone(todo)}
                    onTogglePinned={() => togglePinned(todo)}
                    onUpdateText={(text) => updateText(todo, text)}
                    onUpdateNotes={(notes) => updateNotes(todo, notes)}
                    onUpdateDueDate={(d) => updateDueDate(todo, d)}
                    onDelete={() => deleteTodo(todo.id)}
                    onStartTimer={() => onStartTimer(todo.project, todo.text)}
                    onToggleNotes={() => toggleExpand(expandedNotes, todo.id, setExpandedNotes)}
                    onToggleSubtasks={() => toggleExpand(expandedSubtasks, todo.id, setExpandedSubtasks)}
                    onAddSubtask={(text) => addSubtask(todo.id, text)}
                    onToggleSubtask={(s) => toggleSubtask(todo.id, s)}
                    onDeleteSubtask={(sid) => deleteSubtask(todo.id, sid)}
                    onDragStart={(e) => handleDragStart(e, todo.id)}
                    onDragOver={(e) => handleDragOver(e, todo.id)}
                    onDrop={(e) => handleDrop(e, todo.id)}
                    onDragEnd={handleDragEnd}
                  />
                ))}

                {archivedTodos.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowArchive((v) => !v)}
                      className="flex items-center gap-2 text-sm text-black/45 transition hover:text-black/70"
                    >
                      {showArchive ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      Archive ({archivedTodos.length})
                    </button>

                    {showArchive && (
                      <div className="mt-2 space-y-2 opacity-50">
                        {archivedTodos.map((todo) => (
                          <TodoRow
                            key={todo.id}
                            todo={todo}
                            isDragging={false}
                            isDragOver={false}
                            notesOpen={false}
                            subtasksOpen={false}
                            onToggleDone={() => toggleDone(todo)}
                            onTogglePinned={() => togglePinned(todo)}
                            onUpdateText={(text) => updateText(todo, text)}
                            onUpdateNotes={(notes) => updateNotes(todo, notes)}
                            onUpdateDueDate={(d) => updateDueDate(todo, d)}
                            onDelete={() => deleteTodo(todo.id)}
                            onStartTimer={() => onStartTimer(todo.project, todo.text)}
                            onToggleNotes={() => {}}
                            onToggleSubtasks={() => {}}
                            onAddSubtask={() => {}}
                            onToggleSubtask={(s) => toggleSubtask(todo.id, s)}
                            onDeleteSubtask={(sid) => deleteSubtask(todo.id, sid)}
                            onDragStart={() => {}}
                            onDragOver={() => {}}
                            onDrop={() => {}}
                            onDragEnd={() => {}}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-none border-[2.5px] border-black bg-black px-5 py-5 text-white shadow-brutal">
          <p className="meta text-white/60">OVERVIEW</p>
          <div className="mt-2 font-display font-bold lowercase text-4xl tracking-tight">{pendingCount}</div>
          <p className="mt-2 text-sm text-white/65">
            {pendingCount === 1 ? "task remaining" : "tasks remaining"}
          </p>

          {totalCount > 0 && (
            <div className="mt-4 space-y-1">
              <div className="h-1.5 overflow-hidden rounded-none bg-white/15">
                <div
                  className="h-full rounded-none bg-fofo-yellow transition-all duration-500"
                  style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-white/40">{doneCount}/{totalCount} done</p>
            </div>
          )}
        </div>

        {projects.length > 0 && (
          <div className="rounded-none border-[2.5px] border-black bg-white p-5 shadow-brutal">
            <p className="meta text-fofo-blue">BY PROJECT</p>
            <h3 className="mt-1 font-display font-bold lowercase text-2xl tracking-tight text-black">Breakdown</h3>

            <div className="mt-4 space-y-2">
              {projects.map((project) => {
                const total = todos.filter((t) => t.project === project).length;
                const remaining = todos.filter((t) => t.project === project && !t.done).length;
                const pct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;

                return (
                  <button
                    key={project}
                    type="button"
                    onClick={() => setActiveFilter(activeFilter === project ? "all" : project)}
                    className={clsx(
                      "w-full rounded-none border px-4 py-3 text-left transition",
                      activeFilter === project
                        ? "border-fofo-blue bg-fofo-blue/5"
                        : "border-black bg-white hover:border-black",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium text-black">{project}</p>
                      <span className="ml-3 shrink-0 text-sm text-black/45">{remaining}/{total}</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-none bg-black/8">
                      <div
                        className="h-full rounded-none bg-fofo-blue transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* Undo delete toasts */}
      {pendingDeletes.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
          {pendingDeletes.map(({ todo }) => (
            <div
              key={todo.id}
              className="flex items-center gap-3 rounded-none border-[2.5px] border-black bg-white px-4 py-2.5 shadow-brutal"
            >
              <span className="text-sm text-black/70">
                &ldquo;{todo.text.length > 40 ? todo.text.slice(0, 40) + "…" : todo.text}&rdquo; deleted
              </span>
              <button
                type="button"
                onClick={() => undoDelete(todo.id)}
                className="text-sm font-medium text-fofo-blue hover:underline"
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── TodoRow ──────────────────────────────────────────────────────────────────

type TodoRowProps = {
  todo: Todo;
  isDragging: boolean;
  isDragOver: boolean;
  notesOpen: boolean;
  subtasksOpen: boolean;
  onToggleDone: () => void;
  onTogglePinned: () => void;
  onUpdateText: (text: string) => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateDueDate: (d: string | null) => void;
  onDelete: () => void;
  onStartTimer: () => void;
  onToggleNotes: () => void;
  onToggleSubtasks: () => void;
  onAddSubtask: (text: string) => void;
  onToggleSubtask: (s: Subtask) => void;
  onDeleteSubtask: (id: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
};

function TodoRow({
  todo,
  isDragging,
  isDragOver,
  notesOpen,
  subtasksOpen,
  onToggleDone,
  onTogglePinned,
  onUpdateText,
  onUpdateNotes,
  onUpdateDueDate,
  onDelete,
  onStartTimer,
  onToggleNotes,
  onToggleSubtasks,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: TodoRowProps) {
  const [editingText, setEditingText] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [showDateInput, setShowDateInput] = useState(false);
  const [dueDateDraft, setDueDateDraft] = useState(todo.dueDate ?? "");
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const overdue = isOverdue(todo.dueDate, todo.done);
  const dueToday = isDueToday(todo.dueDate, todo.done);
  const doneCount = todo.subtasks.filter((s) => s.done).length;

  function commitText() {
    setEditingText(false);
    onUpdateText(editText);
  }

  return (
    <div
      draggable={!todo.done}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={getAgingStyle(todo.createdAt, todo.done)}
      className={clsx(
        "rounded-none border transition",
        todo.done ? "border-black/8 bg-black/[0.02]" : "border-black bg-white",
        isDragging && "opacity-40",
        isDragOver && !todo.done && "border-fofo-blue ring-2 ring-fofo-blue/15",
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-2 px-3 py-3">
        {/* Drag handle */}
        {!todo.done && (
          <div className="mt-0.5 cursor-grab touch-none text-black/20 hover:text-black/40">
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {/* Checkbox */}
        <button
          type="button"
          onClick={onToggleDone}
          className={clsx(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-none border-2 transition",
            todo.done
              ? "border-fofo-blue bg-fofo-blue text-white"
              : "border-black hover:border-fofo-blue",
          )}
        >
          {todo.done && <Check className="h-3 w-3" />}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Text */}
          {editingText ? (
            <input
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitText();
                if (e.key === "Escape") { setEditingText(false); setEditText(todo.text); }
              }}
              onBlur={commitText}
              className="w-full rounded-none border border-fofo-blue bg-white px-3 py-1 text-sm outline-none ring-2 ring-fofo-blue/10"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setEditingText(true); setEditText(todo.text); }}
              className={clsx(
                "block w-full truncate text-left text-sm transition",
                todo.done ? "text-black/40 line-through" : "text-black hover:text-fofo-blue",
              )}
            >
              {todo.pinned && <Star className="mb-0.5 mr-1 inline h-3 w-3 text-amber-400" />}
              {todo.text}
            </button>
          )}

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {todo.project && (
              <span className="rounded-none bg-black/5 px-2 py-0.5 text-xs text-black/50">
                {todo.project}
              </span>
            )}

            {todo.dueDate && !showDateInput && (
              <button
                type="button"
                onClick={() => setShowDateInput(true)}
                className={clsx(
                  "flex items-center gap-1 rounded-none px-2 py-0.5 text-xs transition",
                  overdue
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : dueToday
                      ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                      : "bg-black/5 text-black/50 hover:bg-black/10",
                )}
              >
                <CalendarDays className="h-3 w-3" />
                {formatDueDate(todo.dueDate)}
              </button>
            )}

            {showDateInput && (
              <input
                autoFocus
                type="date"
                value={dueDateDraft}
                min="2000-01-01"
                max="2099-12-31"
                onChange={(e) => setDueDateDraft(e.target.value)}
                onBlur={() => {
                  setShowDateInput(false);
                  const year = parseInt(dueDateDraft.split("-")[0] ?? "0", 10);
                  if (!dueDateDraft) onUpdateDueDate(null);
                  else if (year >= 2000 && year <= 2099) onUpdateDueDate(dueDateDraft);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setShowDateInput(false); }
                  if (e.key === "Enter") {
                    const year = parseInt(dueDateDraft.split("-")[0] ?? "0", 10);
                    if (dueDateDraft && year >= 2000 && year <= 2099) {
                      onUpdateDueDate(dueDateDraft);
                      setShowDateInput(false);
                    }
                  }
                }}
                className="rounded-none border border-fofo-blue px-2 py-0.5 text-xs outline-none ring-2 ring-fofo-blue/10"
              />
            )}

            {!todo.dueDate && !showDateInput && !todo.done && (
              <button
                type="button"
                onClick={() => setShowDateInput(true)}
                className="flex items-center gap-1 rounded-none px-2 py-0.5 text-xs text-black/25 transition hover:text-black/50"
              >
                <CalendarDays className="h-3 w-3" />
                Due date
              </button>
            )}

            {todo.subtasks.length > 0 && (
              <button
                type="button"
                onClick={onToggleSubtasks}
                className="text-xs text-black/40 transition hover:text-black/70"
              >
                {doneCount}/{todo.subtasks.length} subtasks
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Pin */}
          <button
            type="button"
            onClick={onTogglePinned}
            title={todo.pinned ? "Unpin" : "Pin to top"}
            className={clsx(
              "rounded-none p-1.5 transition",
              todo.pinned
                ? "text-amber-400 hover:text-amber-500"
                : "text-black/20 hover:text-amber-400",
            )}
          >
            <Star className="h-3.5 w-3.5" />
          </button>

          {/* Notes toggle */}
          <button
            type="button"
            onClick={onToggleNotes}
            title="Notes"
            className={clsx(
              "rounded-none p-1.5 text-xs transition",
              notesOpen || todo.notes
                ? "text-fofo-blue hover:text-fofo-blue/70"
                : "text-black/20 hover:text-black/50",
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
            </svg>
          </button>

          {/* Subtasks toggle */}
          <button
            type="button"
            onClick={onToggleSubtasks}
            title="Subtasks"
            className={clsx(
              "rounded-none p-1.5 transition",
              subtasksOpen || todo.subtasks.length > 0
                ? "text-fofo-blue hover:text-fofo-blue/70"
                : "text-black/20 hover:text-black/50",
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>

          {/* Start timer */}
          {todo.project && !todo.done && (
            <button
              type="button"
              onClick={onStartTimer}
              title="Start timer in Hours"
              className="rounded-none p-1.5 text-black/20 transition hover:text-fofo-blue"
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            className="rounded-none border border-red-200 bg-red-50 p-1.5 text-red-600 transition hover:border-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Notes panel */}
      {notesOpen && (
        <div className="border-t border-black/8 px-10 py-3">
          <textarea
            value={todo.notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder="Add notes…"
            rows={3}
            className="w-full resize-none rounded-none border-[2.5px] border-black bg-black/[0.02] px-3 py-2 text-sm text-black/70 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
          />
        </div>
      )}

      {/* Subtasks panel */}
      {subtasksOpen && (
        <div className="border-t border-black/8 px-10 py-3 space-y-2">
          {todo.subtasks.map((sub) => (
            <div key={sub.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleSubtask(sub)}
                className={clsx(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition",
                  sub.done
                    ? "border-fofo-blue bg-fofo-blue text-white"
                    : "border-black/25 hover:border-fofo-blue",
                )}
              >
                {sub.done && <Check className="h-2.5 w-2.5" />}
              </button>
              <span className={clsx("flex-1 text-sm", sub.done && "text-black/40 line-through")}>
                {sub.text}
              </span>
              <button
                type="button"
                onClick={() => onDeleteSubtask(sub.id)}
                className="text-black/20 transition hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}

          <input
            value={subtaskDraft}
            onChange={(e) => setSubtaskDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && subtaskDraft.trim()) {
                onAddSubtask(subtaskDraft);
                setSubtaskDraft("");
              }
            }}
            placeholder="Add subtask and press Enter…"
            className="w-full rounded-none border-[2.5px] border-black bg-white px-3 py-1.5 text-sm outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
          />
        </div>
      )}
    </div>
  );
}
