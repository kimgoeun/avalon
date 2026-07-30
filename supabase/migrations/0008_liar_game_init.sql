-- Liar Game schema.

create table liar_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  phase text not null default 'lobby', -- lobby | discussion | result
  category text,
  word text,
  liar_word text,
  liar_mode text not null default 'category', -- category | fakeWord
  show_category_to_liar boolean not null default true,
  liar_count int not null default 1,
  created_at timestamptz not null default now()
);

create table liar_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references liar_rooms(id) on delete cascade,
  nickname text not null,
  seat_order int not null,
  is_host boolean not null default false,
  is_liar boolean not null default false,
  created_at timestamptz not null default now(),
  unique(room_id, seat_order)
);

create index on liar_players(room_id);

alter table liar_rooms enable row level security;
alter table liar_players enable row level security;

-- Open policies: casual party-game app with no auth; anyone with the room code can read/write.
create policy "liar_rooms readable" on liar_rooms for select using (true);
create policy "liar_rooms insertable" on liar_rooms for insert with check (true);
create policy "liar_rooms updatable" on liar_rooms for update using (true);

create policy "liar_players readable" on liar_players for select using (true);
create policy "liar_players insertable" on liar_players for insert with check (true);
create policy "liar_players updatable" on liar_players for update using (true);
create policy "liar_players deletable" on liar_players for delete using (true);

alter publication supabase_realtime add table liar_rooms;
alter publication supabase_realtime add table liar_players;
