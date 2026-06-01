"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ListTodo, Plus, Trash2 } from "lucide-react";

type Todo = {
  id: string;
  text: string;
  project: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
  doneAt: string | null;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export default function TodoBoard() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftProject, setDraftProject] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestJson<{ todos: Todo[] }>("/api/workspace/todos")
      .then((payload) => {
        setTodos(payload.todos);
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
  }, []);

  const projects = Array.from(
    new Set(todos.map((t) => t.project).filter(Boolean)),
  ).sort();

  const visible = todos.filter((t) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "done") return t.done;
    return t.project === activeFilter && !t.done;
  });

  const pending = visible.filter((t) => !t.done);
  const done = visible.filter((t) => t.done);

  async function addTodo() {
    const text = draftText.trim();

    if (!text) return;

    try {
      const payload = await requestJson<{ todo: Todo }>("/api/workspace/todos", {
        method: "POST",
        body: JSON.stringify({ text, project: draftProject }),
      });

      setTodos((prev) => [payload.todo, ...prev]);
      setDraftText("");
    } catch {
      // silently ignore
    }
  }

  async function toggleDone(todo: Todo) {
    const nextDone = !todo.done;

    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, done: nextDone, doneAt: nextDone ? new Date().toISOString() : null } : t)),
    );

    try {
      const payload = await requestJson<{ todo: Todo }>(
        `/api/workspace/todos/${todo.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ done: nextDone }),
        },
      );

      setTodos((prev) =>
        prev.map((t) => (t.id === payload.todo.id ? payload.todo : t)),
      );
    } catch {
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, done: todo.done, doneAt: todo.doneAt } : t)),
      );
    }
  }

  async function deleteTodo(todoId: string) {
    setTodos((prev) => prev.filter((t) => t.id !== todoId));

    try {
      await requestJson<{ ok: true }>(`/api/workspace/todos/${todoId}`, {
        method: "DELETE",
      });
    } catch {
      // already removed from UI; nothing to roll back meaningfully
    }
  }

  async function saveEdit(todoId: string) {
    const text = editText.trim();

    if (!text) {
      setEditingId(null);
      return;
    }

    try {
      const payload = await requestJson<{ todo: Todo }>(
        `/api/workspace/todos/${todoId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ text }),
        },
      );

      setTodos((prev) =>
        prev.map((t) => (t.id === payload.todo.id ? payload.todo : t)),
      );
    } catch {
      // keep existing text on failure
    }

    setEditingId(null);
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditText(todo.text);
  }

  const pendingCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.filter((t) => t.done).length;

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        <div className="rounded-[28px] border border-black/10 bg-white/85 p-4 shadow-lg shadow-black/5 backdrop-blur md:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-black/[0.03]">
              <ListTodo className="h-4 w-4 text-black/50" />
            </div>
            <div>
              <p className="meta text-fofo-blue">TO-DO</p>
              <h2 className="mt-0.5 font-display text-3xl tracking-tight text-black md:text-4xl">
                Tasks
              </h2>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTodo();
                }}
                placeholder="Add a task and press Enter…"
                className="w-full rounded-2xl border border-black/12 bg-white px-4 py-3 pr-12 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
              />
              <button
                type="button"
                onClick={addTodo}
                disabled={!draftText.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-fofo-blue text-white transition disabled:opacity-30 hover:scale-105"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <input
              value={draftProject}
              onChange={(e) => setDraftProject(e.target.value)}
              placeholder="Project (optional)"
              className="w-40 shrink-0 rounded-2xl border border-black/12 bg-white px-4 py-3 outline-none transition focus:border-fofo-blue focus:ring-2 focus:ring-fofo-blue/10"
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white/85 p-4 shadow-lg shadow-black/5 backdrop-blur md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", ...projects] as string[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  activeFilter === filter
                    ? "border-fofo-blue bg-fofo-blue text-white"
                    : "border-black/10 bg-white text-black/65 hover:border-black/20 hover:text-black",
                )}
              >
                {filter === "all" ? "All projects" : filter}
              </button>
            ))}

            {doneCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setActiveFilter(activeFilter === "done" ? "all" : "done")
                }
                className={clsx(
                  "ml-auto rounded-full border px-3 py-1.5 text-sm transition",
                  activeFilter === "done"
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white text-black/55 hover:border-black/20 hover:text-black",
                )}
              >
                {doneCount} done
              </button>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {!hydrated ? (
              <div className="rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm text-black/55">
                Loading…
              </div>
            ) : pending.length === 0 && done.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/15 bg-white/70 px-4 py-10 text-center text-sm text-black/55">
                No tasks yet. Add one above.
              </div>
            ) : (
              <>
                {pending.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    isEditing={editingId === todo.id}
                    editText={editText}
                    onEditTextChange={setEditText}
                    onToggle={() => toggleDone(todo)}
                    onDelete={() => deleteTodo(todo.id)}
                    onStartEdit={() => startEdit(todo)}
                    onSaveEdit={() => saveEdit(todo.id)}
                    onCancelEdit={() => setEditingId(null)}
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
                    isEditing={editingId === todo.id}
                    editText={editText}
                    onEditTextChange={setEditText}
                    onToggle={() => toggleDone(todo)}
                    onDelete={() => deleteTodo(todo.id)}
                    onStartEdit={() => startEdit(todo)}
                    onSaveEdit={() => saveEdit(todo.id)}
                    onCancelEdit={() => setEditingId(null)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[28px] border border-black/10 bg-black px-5 py-5 text-white shadow-lg shadow-black/10">
          <p className="meta text-white/60">OVERVIEW</p>
          <div className="mt-2 font-display text-4xl tracking-tight">
            {pendingCount}
          </div>
          <p className="mt-2 text-sm text-white/65">
            {pendingCount === 1 ? "task remaining" : "tasks remaining"}
          </p>

          {doneCount > 0 && (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-lime-300 transition-all duration-500"
                style={{
                  width: `${Math.round((doneCount / (pendingCount + doneCount)) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>

        {projects.length > 0 && (
          <div className="rounded-[28px] border border-black/10 bg-white/90 p-5 shadow-lg shadow-black/5 backdrop-blur">
            <p className="meta text-fofo-blue">BY PROJECT</p>
            <h3 className="mt-1 font-display text-2xl tracking-tight text-black">
              Breakdown
            </h3>

            <div className="mt-4 space-y-2">
              {projects.map((project) => {
                const total = todos.filter((t) => t.project === project).length;
                const remaining = todos.filter(
                  (t) => t.project === project && !t.done,
                ).length;

                return (
                  <button
                    key={project}
                    type="button"
                    onClick={() =>
                      setActiveFilter(
                        activeFilter === project ? "all" : project,
                      )
                    }
                    className={clsx(
                      "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                      activeFilter === project
                        ? "border-fofo-blue bg-fofo-blue/5"
                        : "border-black/10 bg-white hover:border-black/20",
                    )}
                  >
                    <p className="truncate text-sm font-medium text-black">
                      {project}
                    </p>
                    <span className="ml-3 shrink-0 text-sm text-black/45">
                      {remaining}/{total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}

type TodoRowProps = {
  todo: Todo;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (value: string) => void;
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
};

function TodoRow({
  todo,
  isEditing,
  editText,
  onEditTextChange,
  onToggle,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: TodoRowProps) {
  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
        todo.done
          ? "border-black/8 bg-black/[0.02]"
          : "border-black/10 bg-white",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
          todo.done
            ? "border-fofo-blue bg-fofo-blue text-white"
            : "border-black/20 hover:border-fofo-blue",
        )}
      >
        {todo.done && <Check className="h-3 w-3" />}
      </button>

      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            autoFocus
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            onBlur={onSaveEdit}
            className="w-full rounded-xl border border-fofo-blue bg-white px-3 py-1.5 text-sm outline-none ring-2 ring-fofo-blue/10"
          />
        ) : (
          <button
            type="button"
            onClick={onStartEdit}
            className={clsx(
              "block w-full truncate text-left text-sm transition",
              todo.done ? "text-black/40 line-through" : "text-black hover:text-fofo-blue",
            )}
          >
            {todo.text}
          </button>
        )}

        {todo.project && !isEditing && (
          <p className="mt-0.5 truncate text-xs text-black/40">{todo.project}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 rounded-full border border-red-200 bg-red-50 p-1.5 text-red-600 transition hover:border-red-300"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
