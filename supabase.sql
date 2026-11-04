-- Run this once in Supabase: SQL Editor, New query, paste, Run.
create table if not exists public.goals_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.goals_state enable row level security;

create policy "read own row"   on public.goals_state for select using (auth.uid() = user_id);
create policy "insert own row" on public.goals_state for insert with check (auth.uid() = user_id);
create policy "update own row" on public.goals_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
