-- Aero Vision update 2. Run ONCE in Supabase -> SQL Editor (after schema.sql). Safe to re-run.

-- 1) Profiles: store the email, create missing profiles, let users create their own row
alter table public.profiles add column if not exists email text not null default '';

insert into public.profiles (id, full_name, email)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', ''), coalesce(u.email, '')
from auth.users u
on conflict (id) do nothing;

update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email = '';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop policy if exists "profile insert self" on public.profiles;
create policy "profile insert self" on public.profiles for insert
  with check (id = auth.uid() and role = 'user');

-- admins can change anybody's role / name
drop policy if exists "profile admin update" on public.profiles;
create policy "profile admin update" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- 2) Pictures for events and team members
alter table public.events add column if not exists image_url text not null default '';
alter table public.team_members add column if not exists photo_url text not null default '';

-- 3) Blog
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  image_url text not null default '',
  author text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
drop policy if exists "posts read" on public.posts;
create policy "posts read" on public.posts for select using (published or public.is_admin());
drop policy if exists "posts admin" on public.posts;
create policy "posts admin" on public.posts for all using (public.is_admin()) with check (public.is_admin());

-- carry over old "news" once
insert into public.posts (title, body, published, created_at)
select n.title, n.body, true, n.created_at from public.news n
where not exists (select 1 from public.posts);
