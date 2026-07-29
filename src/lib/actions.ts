import { supabase } from "./supabase";
import type { Tables } from "./database.types";
import {
  QUEST_CONFIGS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  RoleOptions,
  assignRoles,
  Role,
} from "./avalon";

export type Room = Tables<"rooms">;
export type Player = Tables<"players">;
export type Quest = Tables<"quests">;
export type Vote = Tables<"votes">;
export type QuestCard = Tables<"quest_cards">;

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createRoom(nickname: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({ code })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") continue; // code collision, retry
      throw error;
    }
    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({ room_id: room.id, nickname, seat_order: 0, is_host: true })
      .select()
      .single();
    if (playerError) throw playerError;
    return { room, player };
  }
  throw new Error("방 코드를 생성하지 못했습니다. 다시 시도해주세요.");
}

export async function joinRoom(code: string, nickname: string) {
  const { data: room, error } = await supabase
    .from("rooms")
    .select()
    .eq("code", code.toUpperCase())
    .single();
  if (error || !room) throw new Error("해당 코드의 방을 찾을 수 없습니다.");
  if (room.phase !== "lobby") throw new Error("이미 게임이 시작된 방입니다.");

  // Concurrent joins can race on the "next seat_order" read, so retry on unique-constraint
  // collisions rather than trusting a single read to be race-free.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existingPlayers, error: playersError } = await supabase
      .from("players")
      .select()
      .eq("room_id", room.id)
      .order("seat_order", { ascending: false })
      .limit(1);
    if (playersError) throw playersError;

    const nextSeat = existingPlayers.length ? existingPlayers[0].seat_order + 1 : 0;
    if (nextSeat >= MAX_PLAYERS) throw new Error(`최대 ${MAX_PLAYERS}명까지 참가할 수 있습니다.`);

    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({ room_id: room.id, nickname, seat_order: nextSeat, is_host: false })
      .select()
      .single();
    if (!playerError) return { room, player };
    if (playerError.code !== "23505") throw playerError;
  }
  throw new Error("참가에 실패했습니다. 다시 시도해주세요.");
}

export async function removePlayerFromRoom(player: Player) {
  await supabase.from("players").delete().eq("id", player.id);

  if (player.is_host) {
    const { data: remaining } = await supabase
      .from("players")
      .select()
      .eq("room_id", player.room_id)
      .order("seat_order", { ascending: true })
      .limit(1);
    if (remaining && remaining.length) {
      await supabase.from("players").update({ is_host: true }).eq("id", remaining[0].id);
    }
  }
}

export async function movePlayer(players: Player[], playerId: string, direction: "up" | "down") {
  const sorted = [...players].sort((a, b) => a.seat_order - b.seat_order);
  const idx = sorted.findIndex((p) => p.id === playerId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return;

  const a = sorted[idx];
  const b = sorted[swapIdx];
  // Swap via a temporary out-of-range seat to avoid colliding with the unique(room_id, seat_order) constraint.
  await supabase.from("players").update({ seat_order: -1 }).eq("id", a.id);
  await supabase.from("players").update({ seat_order: a.seat_order }).eq("id", b.id);
  await supabase.from("players").update({ seat_order: b.seat_order }).eq("id", a.id);
}

export async function startGame(room: Room, players: Player[], options: RoleOptions) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`${MIN_PLAYERS}~${MAX_PLAYERS}명이 필요합니다.`);
  }
  const sorted = [...players].sort((a, b) => a.seat_order - b.seat_order);
  const roleMap = assignRoles(
    sorted.map((p) => p.id),
    options
  );

  await Promise.all(
    sorted.map((p) => supabase.from("players").update({ role: roleMap[p.id] as Role }).eq("id", p.id))
  );

  const config = QUEST_CONFIGS[players.length];
  const { error: questError } = await supabase.from("quests").insert({
    room_id: room.id,
    round: 1,
    team_size: config.teamSizes[0],
    fails_required: config.failsRequired[0],
    attempt: 1,
  });
  if (questError) throw questError;

  const { error } = await supabase
    .from("rooms")
    .update({ phase: "reveal", round: 1, leader_index: 0, reject_count: 0 })
    .eq("id", room.id);
  if (error) throw error;
}

export async function advanceToTeamBuilding(roomId: string) {
  await supabase.from("rooms").update({ phase: "team_building" }).eq("id", roomId);
}

export async function proposeTeam(quest: Quest, teamPlayerIds: string[], roomId: string) {
  const { error } = await supabase
    .from("quests")
    .update({ team_player_ids: teamPlayerIds })
    .eq("id", quest.id);
  if (error) throw error;
  await supabase.from("rooms").update({ phase: "voting" }).eq("id", roomId);
}

export async function castVote(questId: string, playerId: string, approve: boolean) {
  const { error } = await supabase
    .from("votes")
    .upsert({ quest_id: questId, player_id: playerId, approve }, { onConflict: "quest_id,player_id" });
  if (error) throw error;
}

export async function submitQuestCard(questId: string, playerId: string, success: boolean) {
  const { error } = await supabase
    .from("quest_cards")
    .upsert({ quest_id: questId, player_id: playerId, success }, { onConflict: "quest_id,player_id" });
  if (error) throw error;
}

export async function assassinate(room: Room, players: Player[], targetPlayerId: string) {
  const merlin = players.find((p) => p.role === "merlin");
  const correct = merlin?.id === targetPlayerId;
  await supabase
    .from("rooms")
    .update({
      phase: "game_over",
      winner: correct ? "evil" : "good",
      win_reason: correct ? "assassin_found_merlin" : "assassin_missed_merlin",
    })
    .eq("id", room.id);
}

export async function resetRoom(room: Room, players: Player[]) {
  const { data: questRows } = await supabase.from("quests").select("id").eq("room_id", room.id);
  const questIds = (questRows ?? []).map((q) => q.id);
  if (questIds.length) {
    await supabase.from("votes").delete().in("quest_id", questIds);
    await supabase.from("quest_cards").delete().in("quest_id", questIds);
    await supabase.from("quests").delete().in("id", questIds);
  }
  await Promise.all(players.map((p) => supabase.from("players").update({ role: null }).eq("id", p.id)));
  await supabase
    .from("rooms")
    .update({
      phase: "lobby",
      round: 1,
      leader_index: 0,
      reject_count: 0,
      winner: null,
      win_reason: null,
      timer_ends_at: null,
      timer_remaining_sec: null,
      timer_label: null,
    })
    .eq("id", room.id);
}

export const DISCUSSION_TIMER_SECONDS = 5 * 60;

export async function startTimer(roomId: string) {
  const endsAt = new Date(Date.now() + DISCUSSION_TIMER_SECONDS * 1000).toISOString();
  await supabase
    .from("rooms")
    .update({ timer_ends_at: endsAt, timer_remaining_sec: null, timer_label: "토론 시간" })
    .eq("id", roomId);
}

export async function pauseTimer(room: Room) {
  if (!room.timer_ends_at) return;
  const remainingSec = Math.max(0, Math.round((new Date(room.timer_ends_at).getTime() - Date.now()) / 1000));
  await supabase
    .from("rooms")
    .update({ timer_ends_at: null, timer_remaining_sec: remainingSec })
    .eq("id", room.id);
}

export async function resumeTimer(room: Room) {
  if (room.timer_remaining_sec == null) return;
  const endsAt = new Date(Date.now() + room.timer_remaining_sec * 1000).toISOString();
  await supabase
    .from("rooms")
    .update({ timer_ends_at: endsAt, timer_remaining_sec: null })
    .eq("id", room.id);
}

export async function clearTimer(roomId: string) {
  await supabase
    .from("rooms")
    .update({ timer_ends_at: null, timer_remaining_sec: null, timer_label: null })
    .eq("id", roomId);
}

// ---- Host-only resolution logic (called from an effect that only runs for the host client) ----

export async function resolveVotesIfComplete(room: Room, players: Player[], quest: Quest, votes: Vote[]) {
  if (room.phase !== "voting") return;
  const relevantVotes = votes.filter((v) => v.quest_id === quest.id);
  if (relevantVotes.length < players.length) return;

  const approveCount = relevantVotes.filter((v) => v.approve).length;
  const majorityApprove = approveCount > players.length / 2;

  if (majorityApprove) {
    await supabase.from("rooms").update({ phase: "quest", reject_count: 0 }).eq("id", room.id);
    return;
  }

  const newRejectCount = room.reject_count + 1;
  if (newRejectCount >= 5) {
    await supabase
      .from("rooms")
      .update({ phase: "game_over", winner: "evil", win_reason: "five_rejections", reject_count: newRejectCount })
      .eq("id", room.id);
    return;
  }

  const nextLeaderIndex = (room.leader_index + 1) % players.length;
  await supabase.from("quests").insert({
    room_id: room.id,
    round: quest.round,
    team_size: quest.team_size,
    fails_required: quest.fails_required,
    attempt: quest.attempt + 1,
  });
  await supabase
    .from("rooms")
    .update({
      phase: "team_building",
      reject_count: newRejectCount,
      leader_index: nextLeaderIndex,
      timer_ends_at: null,
      timer_remaining_sec: null,
      timer_label: null,
    })
    .eq("id", room.id);
}

export async function resolveQuestIfComplete(
  room: Room,
  players: Player[],
  quest: Quest,
  cards: QuestCard[],
  allQuests: Quest[]
) {
  if (room.phase !== "quest") return;
  const relevantCards = cards.filter((c) => c.quest_id === quest.id);
  if (relevantCards.length < quest.team_size) return;

  const failCount = relevantCards.filter((c) => !c.success).length;
  const result = failCount >= quest.fails_required ? "fail" : "success";
  await supabase.from("quests").update({ result }).eq("id", quest.id);

  const resolvedQuests = allQuests.filter((q) => q.round !== quest.round || q.id === quest.id);
  const successes = resolvedQuests.filter((q) => q.id === quest.id ? result === "success" : q.result === "success").length;
  const fails = resolvedQuests.filter((q) => q.id === quest.id ? result === "fail" : q.result === "fail").length;

  const hasAssassin = players.some((p) => p.role === "assassin");

  if (fails >= 3) {
    await supabase
      .from("rooms")
      .update({ phase: "game_over", winner: "evil", win_reason: "three_fails" })
      .eq("id", room.id);
    return;
  }

  if (successes >= 3) {
    if (hasAssassin) {
      await supabase.from("rooms").update({ phase: "assassin" }).eq("id", room.id);
    } else {
      await supabase
        .from("rooms")
        .update({ phase: "game_over", winner: "good", win_reason: "three_successes" })
        .eq("id", room.id);
    }
    return;
  }

  const nextRound = quest.round + 1;
  const config = QUEST_CONFIGS[players.length];
  const nextLeaderIndex = (room.leader_index + 1) % players.length;
  await supabase.from("quests").insert({
    room_id: room.id,
    round: nextRound,
    team_size: config.teamSizes[nextRound - 1],
    fails_required: config.failsRequired[nextRound - 1],
    attempt: 1,
  });
  await supabase
    .from("rooms")
    .update({
      phase: "team_building",
      round: nextRound,
      leader_index: nextLeaderIndex,
      reject_count: 0,
      timer_ends_at: null,
      timer_remaining_sec: null,
      timer_label: null,
    })
    .eq("id", room.id);
}
