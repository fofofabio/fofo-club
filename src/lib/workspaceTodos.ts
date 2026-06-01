import { query } from "@/lib/db";

export type WorkspaceTodoSubtask = {
  id: string;
  text: string;
  done: boolean;
  sortOrder: number;
};

export type WorkspaceTodo = {
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
  subtasks: WorkspaceTodoSubtask[];
};

type WorkspaceTodoRow = {
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
  subtasks: WorkspaceTodoSubtask[];
};

export async function listWorkspaceTodos(userId: string) {
  const result = await query<WorkspaceTodoRow>(
    `
      select
        t.id,
        t.text,
        t.project_name as project,
        t.done,
        t.pinned,
        t.due_date::text as "dueDate",
        t.notes,
        t.sort_order as "sortOrder",
        t.created_at::text as "createdAt",
        t.done_at::text as "doneAt",
        coalesce(
          json_agg(
            json_build_object(
              'id', s.id,
              'text', s.text,
              'done', s.done,
              'sortOrder', s.sort_order
            ) order by s.sort_order asc, s.created_at asc
          ) filter (where s.id is not null),
          '[]'::json
        ) as subtasks
      from workspace_todos t
      left join workspace_todo_subtasks s on s.todo_id = t.id
      where t.user_id = $1
      group by t.id
      order by t.done asc, t.pinned desc, t.sort_order asc, t.created_at desc
    `,
    [userId],
  );

  return result.rows;
}

export async function createWorkspaceTodo(
  userId: string,
  input: { text: string; project?: string; dueDate?: string },
) {
  const result = await query<WorkspaceTodoRow>(
    `
      insert into workspace_todos (user_id, text, project_name, due_date)
      values ($1, $2, $3, $4)
      returning
        id,
        text,
        project_name as project,
        done,
        pinned,
        due_date::text as "dueDate",
        notes,
        sort_order as "sortOrder",
        created_at::text as "createdAt",
        done_at::text as "doneAt"
    `,
    [userId, input.text.trim(), input.project?.trim() ?? "", input.dueDate ?? null],
  );

  return { ...result.rows[0], subtasks: [] as WorkspaceTodoSubtask[] };
}

export async function updateWorkspaceTodo(
  userId: string,
  todoId: string,
  input: {
    text?: string;
    project?: string;
    done?: boolean;
    pinned?: boolean;
    dueDate?: string | null;
    notes?: string;
  },
) {
  const updates: string[] = [];
  const values: unknown[] = [todoId, userId];

  if (input.text !== undefined) {
    values.push(input.text.trim());
    updates.push(`text = $${values.length}`);
  }
  if (input.project !== undefined) {
    values.push(input.project.trim());
    updates.push(`project_name = $${values.length}`);
  }
  if (input.done !== undefined) {
    values.push(input.done);
    updates.push(`done = $${values.length}`);
    updates.push(`done_at = ${input.done ? "now()" : "null"}`);
  }
  if (input.pinned !== undefined) {
    values.push(input.pinned);
    updates.push(`pinned = $${values.length}`);
  }
  if ("dueDate" in input) {
    values.push(input.dueDate ?? null);
    updates.push(`due_date = $${values.length}`);
  }
  if (input.notes !== undefined) {
    values.push(input.notes);
    updates.push(`notes = $${values.length}`);
  }

  if (!updates.length) return null;

  const result = await query<WorkspaceTodoRow>(
    `
      update workspace_todos
      set ${updates.join(", ")}
      where id = $1 and user_id = $2
      returning
        id,
        text,
        project_name as project,
        done,
        pinned,
        due_date::text as "dueDate",
        notes,
        sort_order as "sortOrder",
        created_at::text as "createdAt",
        done_at::text as "doneAt"
    `,
    values,
  );

  return result.rows[0] ?? null;
}

export async function reorderWorkspaceTodos(userId: string, orderedIds: string[]) {
  if (!orderedIds.length) return;

  const cases = orderedIds
    .map((_, i) => `when id = $${i + 2} then ${i}`)
    .join(" ");

  const placeholders = orderedIds.map((_, i) => `$${i + 2}`).join(", ");

  await query(
    `
      update workspace_todos
      set sort_order = case ${cases} end
      where user_id = $1 and id in (${placeholders})
    `,
    [userId, ...orderedIds],
  );
}

export async function deleteWorkspaceTodo(userId: string, todoId: string) {
  const result = await query<{ id: string }>(
    `
      delete from workspace_todos
      where id = $1 and user_id = $2
      returning id
    `,
    [todoId, userId],
  );

  return Boolean(result.rows[0]);
}

export async function clearCompletedWorkspaceTodos(userId: string) {
  await query(
    `delete from workspace_todos where user_id = $1 and done = true`,
    [userId],
  );
}
