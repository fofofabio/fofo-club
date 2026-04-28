import { query } from "@/lib/db";

export type WorkspaceUser = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
};

type WorkspaceUserRow = {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
};

export async function findWorkspaceUserByEmail(email: string) {
  const result = await query<WorkspaceUserRow>(
    `
      select id, email, name, password_hash
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
  } satisfies WorkspaceUser;
}
