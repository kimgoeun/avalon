-- Rework gyeolhap toward the actual 시즌2 데스매치 rules: 10 static-9-card rounds
-- (no deck refill within a round), a 10s decision window per turn, a 5s sub-window
-- to name 3 cards after declaring "합!", and a 6-consecutive-pass round-end condition.

alter table gyeolhap_rooms add column round int not null default 1;
alter table gyeolhap_rooms add column round_starter_id uuid;
alter table gyeolhap_rooms add column pass_streak int not null default 0;
alter table gyeolhap_rooms add column declared_by uuid;
alter table gyeolhap_rooms add column sub_deadline timestamptz;
