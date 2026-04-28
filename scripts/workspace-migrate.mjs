import { readFile } from "node:fs/promises";
import { Pool } from "pg";

import { loadEnvLocal } from "./load-env-local.mjs";

await loadEnvLocal();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({ connectionString });

try {
  const sql = await readFile(new URL("../db/workspace.sql", import.meta.url), "utf8");
  await pool.query(sql);
  console.log("Workspace schema migrated.");
} finally {
  await pool.end();
}
