-- Gyeolhap (결합) game schema — a 2-player turn-based SET variant.

create table gyeolhap_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  phase text not null default 'lobby', -- lobby | playing | game_over
  deck int[] not null default '{}',
  turn_player_id uuid,
  turn_ends_at timestamptz,
  winner_id uuid,
  created_at timestamptz not null default now()
);

create table gyeolhap_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references gyeolhap_rooms(id) on delete cascade,
  nickname text not null,
  seat_order int not null,
  is_host boolean not null default false,
  score int not null default 0,
  created_at timestamptz not null default now(),
  unique(room_id, seat_order)
);

create table gyeolhap_board_cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references gyeolhap_rooms(id) on delete cascade,
  position int not null,
  card_code int not null, -- 0..26, decoded into shape/bg/fg via base-3 digits
  created_at timestamptz not null default now(),
  unique(room_id, position)
);

create index on gyeolhap_players(room_id);
create index on gyeolhap_board_cards(room_id);

alter table gyeolhap_rooms enable row level security;
alter table gyeolhap_players enable row level security;
alter table gyeolhap_board_cards enable row level security;

-- Open policies: casual party-game app with no auth; anyone with the room code can read/write.
create policy "gyeolhap_rooms readable" on gyeolhap_rooms for select using (true);
create policy "gyeolhap_rooms insertable" on gyeolhap_rooms for insert with check (true);
create policy "gyeolhap_rooms updatable" on gyeolhap_rooms for update using (true);

create policy "gyeolhap_players readable" on gyeolhap_players for select using (true);
create policy "gyeolhap_players insertable" on gyeolhap_players for insert with check (true);
create policy "gyeolhap_players updatable" on gyeolhap_players for update using (true);
create policy "gyeolhap_players deletable" on gyeolhap_players for delete using (true);

create policy "gyeolhap_board_cards readable" on gyeolhap_board_cards for select using (true);
create policy "gyeolhap_board_cards insertable" on gyeolhap_board_cards for insert with check (true);
create policy "gyeolhap_board_cards updatable" on gyeolhap_board_cards for update using (true);
create policy "gyeolhap_board_cards deletable" on gyeolhap_board_cards for delete using (true);

alter publication supabase_realtime add table gyeolhap_rooms;
alter publication supabase_realtime add table gyeolhap_players;
alter publication supabase_realtime add table gyeolhap_board_cards;
