import { query } from "@/lib/db";

export type WorkspaceUser = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  sessionVersion: number;
};

type WorkspaceUserRow = {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  session_version: number;
};

export async function findWorkspaceUserByEmail(email: string) {
  const result = await query<WorkspaceUserRow>(
    `
      select id, email, name, password_hash, session_version
      from workspace_users
      where lower(email) = lower($1)
      limit 1
    `,
    [email],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    sessionVersion: row.session_version,
  } satisfies WorkspaceUser;
}

export async function findWorkspaceUserSessionVersion(id: string) {
  const result = await query<{ session_version: number }>(
    `select session_version from workspace_users where id = $1 limit 1`,
    [id],
  );
  return result.rows[0]?.session_version ?? null;
}
