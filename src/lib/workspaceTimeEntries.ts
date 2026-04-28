import { query } from "@/lib/db";

export type WorkspaceTimeEntry = {
  id: string;
  project: string;
  task: string;
  date: string;
  start: string;
  end: string;
  createdAt: string;
};

export type WorkspaceActiveSession = {
  id: string;
  project: string;
  task: string;
  startedAt: string;
  timezone: string;
};

export type WorkspaceTimeEntryInput = {
  project: string;
  task: string;
  date: string;
  start: string;
  end: string;
};

type WorkspaceTimeEntryRow = {
  id: string;
  project: string;
  task: string;
  date: string;
  start: string;
  end: string;
  createdAt: string;
};

type WorkspaceActiveSessionRow = {
  id: string;
  project: string;
  task: string;
  startedAt: string;
  timezone: string;
};

function formatLocalDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatLocalTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export async function listWorkspaceTimeEntries(userId: string) {
  const result = await query<WorkspaceTimeEntryRow>(
    `
      select
        id,
        project_name as project,
        task,
        entry_date::text as date,
        to_char(start_time, 'HH24:MI') as start,
        to_char(end_time, 'HH24:MI') as end,
        created_at::text as "createdAt"
      from workspace_time_entries
      where user_id = $1
      order by entry_date asc, start_time asc
    `,
    [userId],
  );

  return result.rows;
}

export async function getWorkspaceActiveSession(userId: string) {
  const result = await query<WorkspaceActiveSessionRow>(
    `
      select
        id,
        project_name as project,
        task,
        started_at::text as "startedAt",
        timezone
      from workspace_active_sessions
      where user_id = $1
      limit 1
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function createWorkspaceTimeEntry(
  userId: string,
  input: WorkspaceTimeEntryInput,
) {
  const result = await query<WorkspaceTimeEntryRow>(
    `
      insert into workspace_time_entries (
        user_id,
        project_name,
        task,
        entry_date,
        start_time,
        end_time
      )
      values ($1, $2, $3, $4::date, $5::time, $6::time)
      returning
        id,
        project_name as project,
        task,
        entry_date::text as date,
        to_char(start_time, 'HH24:MI') as start,
        to_char(end_time, 'HH24:MI') as end,
        created_at::text as "createdAt"
    `,
    [userId, input.project, input.task, input.date, input.start, input.end],
  );

  return result.rows[0];
}

export async function updateWorkspaceTimeEntry(
  userId: string,
  entryId: string,
  input: WorkspaceTimeEntryInput,
) {
  const result = await query<WorkspaceTimeEntryRow>(
    `
      update workspace_time_entries
      set
        project_name = $3,
        task = $4,
        entry_date = $5::date,
        start_time = $6::time,
        end_time = $7::time,
        updated_at = now()
      where id = $1 and user_id = $2
      returning
        id,
        project_name as project,
        task,
        entry_date::text as date,
        to_char(start_time, 'HH24:MI') as start,
        to_char(end_time, 'HH24:MI') as end,
        created_at::text as "createdAt"
    `,
    [entryId, userId, input.project, input.task, input.date, input.start, input.end],
  );

  return result.rows[0] ?? null;
}

export async function deleteWorkspaceTimeEntry(userId: string, entryId: string) {
  const result = await query<{ id: string }>(
    `
      delete from workspace_time_entries
      where id = $1 and user_id = $2
      returning id
    `,
    [entryId, userId],
  );

  return Boolean(result.rows[0]);
}

export async function startWorkspaceActiveSession(
  userId: string,
  input: {
    project: string;
    task: string;
    timezone: string;
  },
) {
  const existing = await getWorkspaceActiveSession(userId);

  if (existing) {
    throw new Error("ACTIVE_SESSION_EXISTS");
  }

  const result = await query<WorkspaceActiveSessionRow>(
    `
      insert into workspace_active_sessions (
        user_id,
        project_name,
        task,
        started_at,
        timezone
      )
      values ($1, $2, $3, now(), $4)
      returning
        id,
        project_name as project,
        task,
        started_at::text as "startedAt",
        timezone
    `,
    [userId, input.project, input.task, input.timezone],
  );

  return result.rows[0];
}

export async function stopWorkspaceActiveSession(userId: string) {
  const activeSession = await getWorkspaceActiveSession(userId);

  if (!activeSession) {
    return null;
  }

  const startedAt = new Date(activeSession.startedAt);
  let endedAt = new Date();
  const date = formatLocalDate(startedAt, activeSession.timezone);
  let start = formatLocalTime(startedAt, activeSession.timezone);
  let end = formatLocalTime(endedAt, activeSession.timezone);

  if (end <= start) {
    endedAt = new Date(startedAt.getTime() + 60_000);
    start = formatLocalTime(startedAt, activeSession.timezone);
    end = formatLocalTime(endedAt, activeSession.timezone);
  }

  const entry = await createWorkspaceTimeEntry(userId, {
    project: activeSession.project,
    task: activeSession.task,
    date,
    start,
    end,
  });

  await query(
    `
      delete from workspace_active_sessions
      where id = $1 and user_id = $2
    `,
    [activeSession.id, userId],
  );

  return {
    entry,
    activeSessionId: activeSession.id,
  };
}
