-- House Bill Tracker: run this once in Supabase > SQL Editor > New query > Run.
-- Safe to run again: it only creates things that do not exist yet.

create table if not exists public.memos (
  id            uuid primary key default gen_random_uuid(),
  month         text not null unique check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  memo_no       text not null,
  old_reading   numeric not null check (old_reading >= 0),
  new_reading   numeric not null check (new_reading >= old_reading),
  units         numeric not null,
  rate          numeric not null default 12,
  electricity   numeric not null,
  rent          numeric not null check (rent >= 0),
  total         numeric not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.settings (
  id          int primary key default 1 check (id = 1),   -- always exactly one row
  house_name  text not null default '',
  person      text not null default '',
  rent        numeric not null default 8080 check (rent >= 0)
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- Security: nobody can read or write these tables from a browser.
-- Row Level Security is ON and there are NO policies, so only the server
-- (which uses the secret / service_role key) can touch the data.
alter table public.memos    enable row level security;
alter table public.settings enable row level security;

-- Supabase no longer exposes new tables automatically, so give the server role access explicitly.
grant select, insert, update, delete on public.memos    to service_role;
grant select, insert, update, delete on public.settings to service_role;
