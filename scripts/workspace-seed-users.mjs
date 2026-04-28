import { randomBytes, scryptSync } from "node:crypto";
import { Pool } from "pg";

import { loadEnvLocal } from "./load-env-local.mjs";

await loadEnvLocal();

const connectionString = process.env.DATABASE_URL;
const usersJson = process.env.WORKSPACE_BOOTSTRAP_USERS_JSON;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

if (!usersJson) {
  throw new Error("WORKSPACE_BOOTSTRAP_USERS_JSON is required.");
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

const users = JSON.parse(usersJson);

if (!Array.isArray(users)) {
  throw new Error("WORKSPACE_BOOTSTRAP_USERS_JSON must be a JSON array.");
}

const pool = new Pool({ connectionString });

try {
  for (const user of users) {
    if (
      !user ||
      typeof user.email !== "string" ||
      typeof user.password !== "string" ||
      !user.email.trim() ||
      !user.password
    ) {
      throw new Error("Each bootstrap user needs email and password.");
    }

    const passwordHash = hashPassword(user.password);

    await pool.query(
      `
        insert into workspace_users (email, name, password_hash)
        values ($1, $2, $3)
        on conflict (email)
        do update set
          name = excluded.name,
          password_hash = excluded.password_hash
      `,
      [user.email.trim().toLowerCase(), user.name?.trim() || null, passwordHash],
    );
  }

  console.log(`Seeded ${users.length} workspace user(s).`);
} finally {
  await pool.end();
}
