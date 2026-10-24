create table if not exists public.bluenote_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default 'BlueNote User',
  workspace jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.bluenote_workspaces enable row level security;

grant select, insert, update, delete on public.bluenote_workspaces to authenticated;

drop policy if exists "Users can read their own BlueNote workspace" on public.bluenote_workspaces;
create policy "Users can read their own BlueNote workspace"
  on public.bluenote_workspaces for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own BlueNote workspace" on public.bluenote_workspaces;
create policy "Users can create their own BlueNote workspace"
  on public.bluenote_workspaces for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own BlueNote workspace" on public.bluenote_workspaces;
create policy "Users can update their own BlueNote workspace"
  on public.bluenote_workspaces for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own BlueNote workspace" on public.bluenote_workspaces;
create policy "Users can delete their own BlueNote workspace"
  on public.bluenote_workspaces for delete
  to authenticated
  using ((select auth.uid()) = user_id);