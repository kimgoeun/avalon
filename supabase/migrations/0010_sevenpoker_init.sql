-- Seven-card poker chip-tracking app. No cards/hands are modeled — only seating
-- order, first-to-act, chip stacks, betting, pot/side-pot math, and payouts.

create table sevenpoker_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  phase text not null default 'lobby', -- lobby | select_first_actor | betting | select_winner | game_over
  bet_unit int not null default 500, -- 학교 unit: 500 or 1000
  hand_number int not null default 1,
  street int not null default 1, -- 1..4 (after 4th/5th/6th/7th card)
  school_pot int not null default 0,
  pot int not null default 0,
  current_bet int not null default 0,
  first_actor_id uuid,
  pending_actors text[] not null default '{}', -- turn queue; front = whose turn
  created_at timestamptz not null default now()
);

create table sevenpoker_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references sevenpoker_rooms(id) on delete cascade,
  nickname text not null,
  seat_order int not null,
  is_host boolean not null default false,
  chips int not null default 100000,
  folded boolean not null default false,
  all_in boolean not null default false,
  street_contrib int not null default 0,
  created_at timestamptz not null default now(),
  unique(room_id, seat_order)
);

create index on sevenpoker_players(room_id);

alter table sevenpoker_rooms enable row level security;
alter table sevenpoker_players enable row level security;

create policy "sevenpoker_rooms readable" on sevenpoker_rooms for select using (true);
create policy "sevenpoker_rooms insertable" on sevenpoker_rooms for insert with check (true);
create policy "sevenpoker_rooms updatable" on sevenpoker_rooms for update using (true);

create policy "sevenpoker_players readable" on sevenpoker_players for select using (true);
create policy "sevenpoker_players insertable" on sevenpoker_players for insert with check (true);
create policy "sevenpoker_players updatable" on sevenpoker_players for update using (true);
create policy "sevenpoker_players deletable" on sevenpoker_players for delete using (true);

alter publication supabase_realtime add table sevenpoker_rooms;
alter publication supabase_realtime add table sevenpoker_players;
