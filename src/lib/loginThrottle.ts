import "server-only";

import { createHmac } from "node:crypto";

import { query } from "@/lib/db";

const WINDOW_MINUTES = 15;

function key(kind: "account" | "client", value: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for login throttling.");
  return `${kind}:${createHmac("sha256", secret).update(value).digest("hex")}`;
}

export function loginBuckets(email: string, request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const client = forwarded || request.headers.get("x-real-ip") || "unknown";
  return [
    { bucket: key("account", email.toLowerCase()), limit: 20 },
    { bucket: key("client", client), limit: 50 },
  ];
}

export async function loginAllowed(buckets: { bucket: string; limit: number }[]) {
  const result = await query<{ bucket_key: string; attempts: number; blocked: boolean; active: boolean }>(
    `select bucket_key, attempts,
            blocked_until is not null and blocked_until > now() as blocked,
            window_started_at > now() - interval '${WINDOW_MINUTES} minutes' as active
       from workspace_login_attempts where bucket_key = any($1::text[])`,
    [buckets.map(({ bucket }) => bucket)],
  );
  return !result.rows.some((row) => row.blocked || (row.active && row.attempts >= (buckets.find((item) => item.bucket === row.bucket_key)?.limit ?? 0)));
}

export async function recordLoginFailure(buckets: { bucket: string; limit: number }[]) {
  for (const { bucket, limit } of buckets) {
    await query(
      `insert into workspace_login_attempts (bucket_key, attempts, window_started_at, blocked_until, updated_at)
       values ($1, 1, now(), null, now())
       on conflict (bucket_key) do update set
         attempts = case when workspace_login_attempts.window_started_at < now() - interval '${WINDOW_MINUTES} minutes' then 1 else workspace_login_attempts.attempts + 1 end,
         window_started_at = case when workspace_login_attempts.window_started_at < now() - interval '${WINDOW_MINUTES} minutes' then now() else workspace_login_attempts.window_started_at end,
         blocked_until = case when workspace_login_attempts.window_started_at >= now() - interval '${WINDOW_MINUTES} minutes' and workspace_login_attempts.attempts + 1 >= $2 then now() + interval '${WINDOW_MINUTES} minutes' else null end,
         updated_at = now()`,
      [bucket, limit],
    );
  }
}

export async function clearLoginFailures(buckets: { bucket: string; limit: number }[]) {
  await query(`delete from workspace_login_attempts where bucket_key = any($1::text[])`, [buckets.map(({ bucket }) => bucket)]);
}
