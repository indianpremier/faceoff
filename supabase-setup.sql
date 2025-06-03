
;-- Enable the pgcrypto extension for UUID generation
create extension if not exists "pgcrypto";

-- Create posts table
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text not null,
  created_at timestamp with time zone default now()
);
