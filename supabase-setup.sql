-- Enable the pgcrypto extension for UUID generation
create extension if not exists "pgcrypto";

-- Create posts table
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text not null,
  support_count int default 0,
  oppose_count int default 0,
  created_at timestamp with time zone default now()
);

-- Create comments table
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Create user_reactions table to track user support/oppose
create table if not exists user_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('support', 'oppose')),
  created_at timestamp with time zone default now(),
  unique(post_id, user_id)
);
