import { Pool } from "pg";

import { loadEnvLocal } from "./load-env-local.mjs";

await loadEnvLocal();
const email = process.argv[2];
if (!email || !process.env.DATABASE_URL) {
  throw new Error("Usage: node scripts/workspace-audit-finances.mjs USER_EMAIL");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const user = await pool.query("select id from workspace_users where lower(email) = lower($1)", [email]);
  if (user.rowCount !== 1) throw new Error("Workspace user not found.");
  const userId = user.rows[0].id;
  const [totals, categories, subscriptions, expenses] = await Promise.all([
    pool.query(
      `select count(*)::int as rows,
        sum(case when amount_cents > 0 then amount_cents else 0 end)::bigint as income,
        -sum(case when amount_cents < 0 then amount_cents else 0 end)::bigint as spend,
        sum(amount_cents)::bigint as net
       from workspace_finance_transactions where user_id = $1`,
      [userId],
    ),
    pool.query(
      `select category, count(*)::int as rows, -sum(amount_cents)::bigint as spend
       from workspace_finance_transactions
       where user_id = $1 and amount_cents < 0
       group by category order by spend desc`,
      [userId],
    ),
    pool.query(
      `select name, amount_cents, status, confidence, occurrences,
        last_charge_on::text, next_charge_on::text
       from workspace_finance_subscriptions
       where user_id = $1 order by status, amount_cents desc`,
      [userId],
    ),
    pool.query(
      `select name, amount_cents, category, due_day, active
       from workspace_finance_monthly_expenses
       where user_id = $1 order by amount_cents desc`,
      [userId],
    ),
  ]);
  let crudSmoke = null;
  if (process.argv.includes("--smoke")) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const created = await client.query(
        `insert into workspace_finance_monthly_expenses
          (user_id, name, amount_cents, category, due_day, active, note)
         values ($1, 'Codex finance smoke', 1234, 'Other', 17, true, 'rollback-only')
         returning id`,
        [userId],
      );
      const expenseId = created.rows[0].id;
      const updated = await client.query(
        `update workspace_finance_monthly_expenses
         set name = 'Codex finance smoke updated', amount_cents = 2345, active = false
         where id = $1 and user_id = $2
         returning amount_cents, active`,
        [expenseId, userId],
      );
      const deleted = await client.query(
        "delete from workspace_finance_monthly_expenses where id = $1 and user_id = $2 returning id",
        [expenseId, userId],
      );
      const subscription = await client.query(
        `select id, status from workspace_finance_subscriptions
         where user_id = $1 order by amount_cents desc limit 1`,
        [userId],
      );
      if (subscription.rowCount !== 1) throw new Error("No subscription available for smoke verification.");
      const originalStatus = subscription.rows[0].status;
      const temporaryStatus = originalStatus === "paused" ? "active" : "paused";
      const changed = await client.query(
        `update workspace_finance_subscriptions set status = $3
         where id = $1 and user_id = $2 returning status`,
        [subscription.rows[0].id, userId, temporaryStatus],
      );
      if (
        updated.rows[0]?.amount_cents !== 2345 ||
        updated.rows[0]?.active !== false ||
        deleted.rowCount !== 1 ||
        changed.rows[0]?.status !== temporaryStatus
      ) {
        throw new Error("Finance CRUD smoke verification failed.");
      }
      crudSmoke = { create: true, update: true, delete: true, subscriptionStatus: true, rolledBack: true };
      await client.query("rollback");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  console.log(JSON.stringify({
    totals: totals.rows[0],
    categories: categories.rows,
    subscriptions: subscriptions.rows,
    monthlyExpenses: expenses.rows,
    crudSmoke,
  }, null, 2));
} finally {
  await pool.end();
}
