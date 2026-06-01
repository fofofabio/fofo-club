import { query } from "@/lib/db";

type SubtaskRow = {
  id: string;
  text: string;
  done: boolean;
  sortOrder: number;
};

export async function createWorkspaceTodoSubtask(
  userId: string,
  todoId: string,
  text: string,
) {
  const ownerCheck = await query<{ id: string }>(
    `select id from workspace_todos where id = $1 and user_id = $2`,
    [todoId, userId],
  );

  if (!ownerCheck.rows[0]) return null;

  const result = await query<SubtaskRow>(
    `
      insert into workspace_todo_subtasks (todo_id, text)
      values ($1, $2)
      returning id, text, done, sort_order as "sortOrder"
    `,
    [todoId, text.trim()],
  );

  return result.rows[0];
}

export async function updateWorkspaceTodoSubtask(
  userId: string,
  todoId: string,
  subtaskId: string,
  input: { text?: string; done?: boolean },
) {
  const ownerCheck = await query<{ id: string }>(
    `select id from workspace_todos where id = $1 and user_id = $2`,
    [todoId, userId],
  );

  if (!ownerCheck.rows[0]) return null;

  const updates: string[] = [];
  const values: unknown[] = [subtaskId, todoId];

  if (input.text !== undefined) {
    values.push(input.text.trim());
    updates.push(`text = $${values.length}`);
  }
  if (input.done !== undefined) {
    values.push(input.done);
    updates.push(`done = $${values.length}`);
  }

  if (!updates.length) return null;

  const result = await query<SubtaskRow>(
    `
      update workspace_todo_subtasks
      set ${updates.join(", ")}
      where id = $1 and todo_id = $2
      returning id, text, done, sort_order as "sortOrder"
    `,
    values,
  );

  return result.rows[0] ?? null;
}

export async function deleteWorkspaceTodoSubtask(
  userId: string,
  todoId: string,
  subtaskId: string,
) {
  const ownerCheck = await query<{ id: string }>(
    `select id from workspace_todos where id = $1 and user_id = $2`,
    [todoId, userId],
  );

  if (!ownerCheck.rows[0]) return false;

  const result = await query<{ id: string }>(
    `delete from workspace_todo_subtasks where id = $1 and todo_id = $2 returning id`,
    [subtaskId, todoId],
  );

  return Boolean(result.rows[0]);
}
