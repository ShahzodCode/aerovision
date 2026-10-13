-- Aero Vision update 3: editable site text. Run ONCE in Supabase -> SQL Editor. Safe to re-run.
create table if not exists public.site_content (
  key text primary key,
  value text not null default ''
);
alter table public.site_content enable row level security;
drop policy if exists "content read" on public.site_content;
create policy "content read" on public.site_content for select using (true);
drop policy if exists "content admin" on public.site_content;
create policy "content admin" on public.site_content for all using (public.is_admin()) with check (public.is_admin());
