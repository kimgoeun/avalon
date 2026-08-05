-- 학교 isn't a separate accumulating stash — it's paid once (at game start) and each
-- hand's winner simply leaves that same ante amount behind in the pot, which becomes
-- the next hand's seed. No separate bucket is needed; `pot` alone carries it.
alter table public.sevenpoker_rooms drop column school_pot;
