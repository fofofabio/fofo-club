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
