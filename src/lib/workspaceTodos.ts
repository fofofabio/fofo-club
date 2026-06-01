import { query } from "@/lib/db";

export type WorkspaceTodo = {
  id: string;
  text: string;
  project: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
  doneAt: string | null;
};

type WorkspaceTodoRow = {
  id: string;
  text: string;
  project: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
  doneAt: string | null;
};

export async function listWorkspaceTodos(userId: string) {
  const result = await query<WorkspaceTodoRow>(
    `
      select
        id,
        text,
        project_name as project,
        done,
        sort_order as "sortOrder",
        created_at::text as "createdAt",
        done_at::text as "doneAt"
      from workspace_todos
      where user_id = $1
      order by done asc, sort_order asc, created_at desc
    `,
    [userId],
  );

  return result.rows;
}

export async function createWorkspaceTodo(
  userId: string,
  input: { text: string; project?: string },
) {
  const result = await query<WorkspaceTodoRow>(
    `
      insert into workspace_todos (user_id, text, project_name)
      values ($1, $2, $3)
      returning
        id,
        text,
        project_name as project,
        done,
        sort_order as "sortOrder",
        created_at::text as "createdAt",
        done_at::text as "doneAt"
    `,
    [userId, input.text.trim(), input.project?.trim() ?? ""],
  );

  return result.rows[0];
}

export async function updateWorkspaceTodo(
  userId: string,
  todoId: string,
  input: { text?: string; project?: string; done?: boolean },
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

  if (!updates.length) {
    return null;
  }

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
        sort_order as "sortOrder",
        created_at::text as "createdAt",
        done_at::text as "doneAt"
    `,
    values,
  );

  return result.rows[0] ?? null;
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
