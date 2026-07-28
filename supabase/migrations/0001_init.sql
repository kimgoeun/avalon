-- Avalon app schema

create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  phase text not null default 'lobby', -- lobby | reveal | team_building | voting | quest | game_over
  round int not null default 1,
  leader_index int not null default 0,
  reject_count int not null default 0,
  use_expansion boolean not null default false,
  winner text, -- 'good' | 'evil' | null
  win_reason text,
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  nickname text not null,
  role text, -- merlin | percival | loyal_servant | morgana | assassin | mordred | oberon
  seat_order int not null,
  is_host boolean not null default false,
  created_at timestamptz not null default now(),
  unique(room_id, seat_order)
);

create table quests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  round int not null,
  team_size int not null,
  team_player_ids uuid[] not null default '{}',
  attempt int not null default 1, -- which team-proposal attempt within this round (resets reject_count context)
  result text, -- 'success' | 'fail' | null
  fails_required int not null default 1, -- rounds needing 2 fails (e.g. round 4 in 7+ players)
  created_at timestamptz not null default now()
);

create table votes (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  approve boolean not null,
  created_at timestamptz not null default now(),
  unique(quest_id, player_id)
);

create table quest_cards (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  success boolean not null,
  created_at timestamptz not null default now(),
  unique(quest_id, player_id)
);

create index on players(room_id);
create index on quests(room_id);
create index on votes(quest_id);
create index on quest_cards(quest_id);

alter table rooms enable row level security;
alter table players enable row level security;
alter table quests enable row level security;
alter table votes enable row level security;
alter table quest_cards enable row level security;

-- Open policies for now: access is gated by knowing the room code / player id client-side.
-- This is a casual party-game app with no auth; anyone with the room code can read/write room state.
create policy "rooms readable" on rooms for select using (true);
create policy "rooms updatable" on rooms for update using (true);
create policy "rooms insertable" on rooms for insert with check (true);

create policy "players readable" on players for select using (true);
create policy "players insertable" on players for insert with check (true);
create policy "players updatable" on players for update using (true);

create policy "quests readable" on quests for select using (true);
create policy "quests insertable" on quests for insert with check (true);
create policy "quests updatable" on quests for update using (true);

create policy "votes readable" on votes for select using (true);
create policy "votes insertable" on votes for insert with check (true);

create policy "quest_cards readable" on quest_cards for select using (true);
create policy "quest_cards insertable" on quest_cards for insert with check (true);

alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table quests;
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table quest_cards;
