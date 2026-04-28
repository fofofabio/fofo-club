import { Pool, type QueryResultRow } from "pg";

declare global {
  var __fofoWorkspacePool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return new Pool({
    connectionString,
  });
}

function getPool() {
  if (!global.__fofoWorkspacePool) {
    global.__fofoWorkspacePool = createPool();
  }

  return global.__fofoWorkspacePool;
}

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  return getPool().query<T>(text, values);
}
