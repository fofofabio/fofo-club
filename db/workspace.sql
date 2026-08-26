create extension if not exists pgcrypto;

create table if not exists workspace_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists workspace_time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references workspace_users(id) on delete cascade,
  project_name text not null,
  task text not null default '',
  entry_date date not null,
  start_time time not null,
  end_time time not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists workspace_time_entries_user_date_idx
  on workspace_time_entries (user_id, entry_date desc, start_time desc);

create table if not exists workspace_active_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references workspace_users(id) on delete cascade,
  project_name text not null,
  task text not null default '',
  started_at timestamptz not null default now(),
  timezone text not null default 'Europe/Berlin',
  created_at timestamptz not null default now()
);

create table if not exists workspace_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references workspace_users(id) on delete cascade,
  text text not null,
  project_name text not null default '',
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index if not exists workspace_todos_user_idx
  on workspace_todos (user_id, sort_order asc, created_at desc);

alter table workspace_todos add column if not exists due_date date;
alter table workspace_todos add column if not exists pinned boolean not null default false;
alter table workspace_todos add column if not exists notes text not null default '';

create table if not exists workspace_todo_subtasks (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references workspace_todos(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists workspace_todo_subtasks_todo_idx
  on workspace_todo_subtasks (todo_id, sort_order asc, created_at asc);

create table if not exists workspace_finance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references workspace_users(id) on delete cascade,
  source text not null default 'bank',
  source_reference text not null,
  booked_on date not null,
  merchant text not null,
  description text not null default '',
  amount_cents integer not null,
  currency text not null default 'EUR',
  category text not null default 'Other',
  provider text not null default 'bank',
  created_at timestamptz not null default now(),
  unique (user_id, source, source_reference)
);

create index if not exists workspace_finance_transactions_user_date_idx
  on workspace_finance_transactions (user_id, booked_on desc, id);

create index if not exists workspace_finance_transactions_user_category_idx
  on workspace_finance_transactions (user_id, category, booked_on desc);

create table if not exists workspace_finance_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references workspace_users(id) on delete cascade,
  merchant_key text not null,
  name text not null,
  amount_cents integer not null,
  cadence text not null default 'monthly',
  last_charge_on date not null,
  next_charge_on date,
  status text not null default 'active',
  confidence text not null default 'medium',
  occurrences integer not null default 0,
  category text not null default 'Subscriptions',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, merchant_key),
  check (status in ('active', 'paused', 'cancelled')),
  check (confidence in ('high', 'medium', 'low'))
);

create index if not exists workspace_finance_subscriptions_user_status_idx
  on workspace_finance_subscriptions (user_id, status, next_charge_on);

create table if not exists workspace_finance_monthly_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references workspace_users(id) on delete cascade,
  name text not null,
  amount_cents integer not null,
  category text not null default 'Other',
  due_day integer,
  active boolean not null default true,
  note text not null default '',
  import_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_cents >= 0),
  check (due_day is null or (due_day between 1 and 31))
);

create unique index if not exists workspace_finance_monthly_expenses_import_idx
  on workspace_finance_monthly_expenses (user_id, import_key)
  where import_key is not null;
