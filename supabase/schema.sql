-- IPAI Community Supabase schema
-- Run this in Supabase SQL Editor once.

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
  flagged integer not null default 0
);

create index if not exists idx_posts_created on public.posts(created_at desc);
create index if not exists idx_posts_flagged_created on public.posts(flagged, created_at desc);

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id bigint not null references public.users(id) on delete cascade,
  parent_id bigint references public.comments(id) on delete cascade,
  body text not null,
  created_at integer not null,
  score integer not null default 1
);

create index if not exists idx_comments_post on public.comments(post_id);

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
