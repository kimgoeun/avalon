-- Step the result reveal instead of showing everything at once: first whether the
-- liar was correctly identified, then (only if so) whether the liar guessed the real
-- word, which together determine the winner.
alter table liar_rooms add column result_stage text not null default 'liar_reveal'; -- liar_reveal | word_check | done
alter table liar_rooms add column winner text; -- liar | citizens | null
