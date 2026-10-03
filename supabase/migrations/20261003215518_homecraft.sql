create table public.houses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  prompt text not null check (char_length(prompt) between 1 and 1000),
  spec jsonb,
  status text not null default 'generating' check (status in ('generating','ready','error')),
  status_message text,
  version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.houses (owner_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'pending' check (status in ('pending','approved','rejected','applied')),
  created_at timestamptz not null default now()
);
create index on public.comments (house_id);

create table public.likes (
  house_id uuid not null references public.houses(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (house_id, user_id)
);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  provider text not null default 'anthropic' check (provider in ('anthropic','openai','google')),
  model text not null default 'claude-sonnet-5-5',
  keys jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.houses enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.user_settings enable row level security;

create policy "houses readable by signed-in users" on public.houses for select to authenticated using (true);
create policy "owners insert houses" on public.houses for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "owners update houses" on public.houses for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owners delete houses" on public.houses for delete to authenticated using (owner_id = (select auth.uid()));

create policy "comments readable by signed-in users" on public.comments for select to authenticated using (true);
create policy "users post pending comments" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'pending');
create policy "house owners moderate comments" on public.comments for update to authenticated
  using (exists (select 1 from public.houses h where h.id = house_id and h.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.houses h where h.id = house_id and h.owner_id = (select auth.uid())));

create policy "likes readable by signed-in users" on public.likes for select to authenticated using (true);
create policy "users add own like" on public.likes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users remove own like" on public.likes for delete to authenticated using (user_id = (select auth.uid()));

create policy "own settings select" on public.user_settings for select to authenticated using (user_id = (select auth.uid()));
create policy "own settings insert" on public.user_settings for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own settings update" on public.user_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.houses, public.comments, public.likes;
