-- Restrict the workspace table to the minimum privileges needed by the client.
-- Row-level security remains the row-ownership boundary for authenticated users.
revoke all privileges on table public.bluenote_workspaces from anon;
revoke truncate, references, trigger on table public.bluenote_workspaces from authenticated;
grant select, insert, update, delete on table public.bluenote_workspaces to authenticated;
