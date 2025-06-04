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

-- Enable Row Level Security
alter table posts enable row level security;
alter table comments enable row level security;
alter table user_reactions enable row level security;

-- Create policies for posts
create policy "Posts are viewable by everyone"
  on posts for select
  using (true);

create policy "Posts are insertable by authenticated users"
  on posts for insert
  with check (auth.uid() = user_id);

-- Create policies for comments
create policy "Comments are viewable by everyone"
  on comments for select
  using (true);

create policy "Comments are insertable by authenticated users"
  on comments for insert
  with check (auth.uid() = user_id);

-- Create policies for user_reactions
create policy "Reactions are viewable by everyone"
  on user_reactions for select
  using (true);

create policy "Reactions are insertable by authenticated users"
  on user_reactions for insert
  with check (auth.uid() = user_id);

create policy "Reactions are updatable by the user who created them"
  on user_reactions for update
  using (auth.uid() = user_id);

create policy "Reactions are deletable by the user who created them"
  on user_reactions for delete
  using (auth.uid() = user_id);
