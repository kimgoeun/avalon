-- The board is fixed for the whole round now (never removed/replenished); what
-- players find is a specific combo, tracked here so "결" checks "found all combos",
-- not "cards happen to have none left".
alter table gyeolhap_rooms add column found_sets text[] not null default '{}';
