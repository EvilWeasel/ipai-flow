-- IPAI Flow Supabase schema
-- Run this in Supabase SQL Editor once.
--
-- Demo note: this baseline schema keeps RLS disabled and grants broad anon
-- privileges for the original hackathon setup. Before exposing a project
-- publicly, either add proper RLS policies or apply server_only_grants.sql and
-- use Supabase only from trusted server-side code with the service role key.

create table if not exists public.users (
  id bigint generated always as identity primary key,
  username text not null unique,
  password_hash text not null,
  created_at integer not null,
  karma integer not null default 0
);

create table if not exists public.sessions (
  id text primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  expires_at integer not null
);

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  title text not null,
  url text,
  body text,
  tags text,
  created_at integer not null,
  score integer not null default 1,
  comment_count integer not null default 0,
  ai_summary text,
  flagged integer not null default 0,
  moderation_status text not null default 'approved'
    constraint posts_moderation_status_check
    check (moderation_status in ('approved', 'pending', 'blocked')),
  moderation_reason text
);

alter table public.posts
  add column if not exists moderation_status text not null default 'approved';
alter table public.posts
  add column if not exists moderation_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_moderation_status_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_moderation_status_check
      check (moderation_status in ('approved', 'pending', 'blocked'));
  end if;
end $$;

create index if not exists idx_posts_created on public.posts(created_at desc);
create index if not exists idx_posts_flagged_created on public.posts(flagged, created_at desc);
create index if not exists idx_posts_moderation_created
  on public.posts(moderation_status, flagged, created_at desc);

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  parent_id bigint references public.comments(id) on delete cascade,
  body text not null,
  created_at integer not null,
  score integer not null default 1,
  moderation_status text not null default 'approved'
    constraint comments_moderation_status_check
    check (moderation_status in ('approved', 'pending', 'blocked')),
  moderation_reason text
);

alter table public.comments
  add column if not exists moderation_status text not null default 'approved';
alter table public.comments
  add column if not exists moderation_reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_moderation_status_check'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_moderation_status_check
      check (moderation_status in ('approved', 'pending', 'blocked'));
  end if;
end $$;

create index if not exists idx_comments_post on public.comments(post_id);
create index if not exists idx_comments_post_moderation
  on public.comments(post_id, moderation_status, created_at);

create table if not exists public.votes (
  user_id bigint not null references public.users(id) on delete cascade,
  target_kind text not null check (target_kind in ('post', 'comment')),
  target_id bigint not null,
  value integer not null check (value in (-1, 1)),
  created_at integer not null,
  primary key (user_id, target_kind, target_id)
);

create index if not exists idx_votes_lookup on public.votes(target_kind, target_id);

alter table public.users disable row level security;
alter table public.sessions disable row level security;
alter table public.posts disable row level security;
alter table public.comments disable row level security;
alter table public.votes disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
