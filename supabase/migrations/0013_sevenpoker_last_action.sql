-- Tracks the most recent betting action so clients can pop a transient
-- "OO님이 OO원 베팅" notification when it changes.
alter table public.sevenpoker_rooms add column last_action text;
alter table public.sevenpoker_rooms add column last_action_at timestamptz;
