-- The 딜러 (dealer) runs in-hand orchestration (picking 선 each street, choosing the
-- hand's winner) so the host doesn't have to do it all. Chosen by the host at game
-- start; automatically passes to the winner of each hand afterward.
alter table public.sevenpoker_rooms add column dealer_id uuid;
