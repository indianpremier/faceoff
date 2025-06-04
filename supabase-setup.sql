-- Add update policy for posts table
create policy "Posts are updatable by anyone"
  on posts for update
  using (true);

-- Ensure columns exist in posts table
do $$ 
begin
    if not exists (select 1 
        from information_schema.columns 
        where table_name = 'posts' 
        and column_name = 'support_count') then
        
        alter table posts 
        add column support_count int default 0;
    end if;

    if not exists (select 1 
        from information_schema.columns 
        where table_name = 'posts' 
        and column_name = 'oppose_count') then
        
        alter table posts 
        add column oppose_count int default 0;
    end if;
end $$;

-- Refresh RLS policies
alter table posts disable row level security;
alter table posts enable row level security;
