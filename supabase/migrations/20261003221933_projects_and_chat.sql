-- Sidebar organisation
alter table public.houses
  add column pinned boolean not null default false,
  add column group_name text check (group_name is null or char_length(group_name) between 1 and 40);

-- Build chat: the owner's prompts/edits and the agents' replies, per house.
create table public.house_messages (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  role text not null check (role in ('user', 'agent')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index on public.house_messages (house_id, created_at);

alter table public.house_messages enable row level security;

create policy "house messages are public" on public.house_messages
  for select to anon, authenticated using (true);
create policy "house owners write messages" on public.house_messages
  for insert to authenticated
  with check (exists (select 1 from public.houses h where h.id = house_id and h.owner_id = (select auth.uid())));

alter publication supabase_realtime add table public.house_messages;
