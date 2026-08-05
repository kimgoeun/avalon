-- street_contrib now tracks a player's cumulative contribution across the whole
-- hand (never resets mid-hand, since the pot itself no longer settles per street).
-- round_contrib tracks just the current betting round (street), reset each street,
-- used for call/raise "owed" math.
alter table public.sevenpoker_players add column round_contrib integer not null default 0;
