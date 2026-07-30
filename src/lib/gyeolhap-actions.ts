import { supabase } from "./supabase";
import type { Tables } from "./database.types";
import {
  ALL_CARD_CODES,
  DECISION_SECONDS,
  DECLARE_SECONDS,
  MAX_ROUNDS,
  PASS_STREAK_LIMIT,
  hasAnyCombo,
  isValidCombo,
  refillBoard,
  shuffle,
} from "./gyeolhap";

export type GyeolhapRoom = Tables<"gyeolhap_rooms">;
export type GyeolhapPlayer = Tables<"gyeolhap_players">;
export type GyeolhapBoardCard = Tables<"gyeolhap_board_cards">;

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function decisionDeadline(): string {
  return new Date(Date.now() + DECISION_SECONDS * 1000).toISOString();
}

function declareDeadline(): string {
  return new Date(Date.now() + DECLARE_SECONDS * 1000).toISOString();
}

export async function createRoom(nickname: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data: room, error } = await supabase
      .from("gyeolhap_rooms")
      .insert({ code })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") continue;
      throw error;
    }
    const { data: player, error: playerError } = await supabase
      .from("gyeolhap_players")
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
    .from("gyeolhap_rooms")
    .select()
    .eq("code", code.toUpperCase())
    .single();
  if (error || !room) throw new Error("해당 코드의 방을 찾을 수 없습니다.");
  if (room.phase !== "lobby") throw new Error("이미 게임이 시작된 방입니다.");

  const { data: existingPlayers, error: playersError } = await supabase
    .from("gyeolhap_players")
    .select()
    .eq("room_id", room.id);
  if (playersError) throw playersError;
  if (existingPlayers.length >= 2) throw new Error("이미 2명이 모인 방입니다.");

  const { data: player, error: playerError } = await supabase
    .from("gyeolhap_players")
    .insert({ room_id: room.id, nickname, seat_order: existingPlayers.length, is_host: false })
    .select()
    .single();
  if (playerError) throw playerError;
  return { room, player };
}

export async function removePlayerFromRoom(player: GyeolhapPlayer) {
  await supabase.from("gyeolhap_players").delete().eq("id", player.id);

  if (player.is_host) {
    const { data: remaining } = await supabase
      .from("gyeolhap_players")
      .select()
      .eq("room_id", player.room_id)
      .order("seat_order", { ascending: true })
      .limit(1);
    if (remaining && remaining.length) {
      await supabase.from("gyeolhap_players").update({ is_host: true }).eq("id", remaining[0].id);
    }
  }
}

export async function startGame(room: GyeolhapRoom, firstPlayerId: string) {
  const shuffled = shuffle(ALL_CARD_CODES);
  const { addedCodes, remainingDeck } = refillBoard([], shuffled);

  await supabase.from("gyeolhap_board_cards").insert(
    addedCodes.map((code, i) => ({ room_id: room.id, position: i, card_code: code }))
  );
  await supabase
    .from("gyeolhap_rooms")
    .update({
      phase: "playing",
      round: 1,
      round_starter_id: firstPlayerId,
      deck: remainingDeck,
      pass_streak: 0,
      declared_by: null,
      sub_deadline: null,
      turn_player_id: firstPlayerId,
      turn_ends_at: decisionDeadline(),
    })
    .eq("id", room.id);
}

// A round ends via a correct "결" or a 6-pass streak. Within a round the board stays at
// 9 cards — a successful 합! tops it back up from the round's held-back 18-card deck
// (never forcing a combo to exist, since a combo-free 9 is a legitimate "결" state).
async function advanceRound(room: GyeolhapRoom, players: GyeolhapPlayer[]) {
  const nextRoundNumber = room.round + 1;
  const [a, b] = players;

  if (nextRoundNumber > MAX_ROUNDS && a && b && a.score !== b.score) {
    const winnerId = a.score > b.score ? a.id : b.id;
    await supabase.from("gyeolhap_board_cards").delete().eq("room_id", room.id);
    await supabase
      .from("gyeolhap_rooms")
      .update({
        phase: "game_over",
        winner_id: winnerId,
        turn_player_id: null,
        turn_ends_at: null,
        declared_by: null,
        sub_deadline: null,
      })
      .eq("id", room.id);
    return;
  }
  // Tied after MAX_ROUNDS: sudden-death overtime — just keep dealing single rounds
  // (round keeps climbing past MAX_ROUNDS) until someone is ahead after a completed round.

  const nextStarter = players.find((p) => p.id !== room.round_starter_id) ?? players[0];
  if (!nextStarter) return;

  await supabase.from("gyeolhap_board_cards").delete().eq("room_id", room.id);
  const shuffled = shuffle(ALL_CARD_CODES);
  const { addedCodes, remainingDeck } = refillBoard([], shuffled);
  await supabase.from("gyeolhap_board_cards").insert(
    addedCodes.map((code, i) => ({ room_id: room.id, position: i, card_code: code }))
  );
  await supabase
    .from("gyeolhap_rooms")
    .update({
      round: nextRoundNumber,
      round_starter_id: nextStarter.id,
      deck: remainingDeck,
      pass_streak: 0,
      declared_by: null,
      sub_deadline: null,
      turn_player_id: nextStarter.id,
      turn_ends_at: decisionDeadline(),
    })
    .eq("id", room.id);
}

// "합!" — commits the current turn player to naming 3 cards within DECLARE_SECONDS.
export async function declareCombo(room: GyeolhapRoom, player: GyeolhapPlayer) {
  if (room.phase !== "playing" || room.turn_player_id !== player.id || room.declared_by) return;
  await supabase
    .from("gyeolhap_rooms")
    .update({ declared_by: player.id, sub_deadline: declareDeadline() })
    .eq("id", room.id)
    .eq("turn_player_id", player.id)
    .is("declared_by", null);
}

export async function submitCombo(
  room: GyeolhapRoom,
  boardCards: GyeolhapBoardCard[],
  players: GyeolhapPlayer[],
  player: GyeolhapPlayer,
  selectedCardIds: string[]
) {
  if (room.phase !== "playing" || room.declared_by !== player.id) return;
  const selected = boardCards.filter((c) => selectedCardIds.includes(c.id));
  if (selected.length !== 3) return;
  const otherPlayer = players.find((p) => p.id !== player.id);
  if (!otherPlayer) return;

  const { data: claimed } = await supabase
    .from("gyeolhap_rooms")
    .update({ declared_by: null, sub_deadline: null, pass_streak: 0 })
    .eq("id", room.id)
    .eq("declared_by", player.id)
    .select()
    .single();
  if (!claimed) return;

  const valid = isValidCombo(selected.map((c) => c.card_code));
  const roomUpdate: Partial<GyeolhapRoom> = { turn_player_id: otherPlayer.id, turn_ends_at: decisionDeadline() };

  if (valid) {
    await supabase.from("gyeolhap_board_cards").delete().in("id", selectedCardIds);
    await supabase.from("gyeolhap_players").update({ score: player.score + 1 }).eq("id", player.id);

    // Top the board back up to 9 from this round's held-back deck (never forcing a
    // combo to exist — a combo-free 9 is exactly the state "결" should apply to).
    const remainingBoard = boardCards.filter((c) => !selectedCardIds.includes(c.id));
    const maxPosition = boardCards.reduce((max, c) => Math.max(max, c.position), -1);
    const { addedCodes, remainingDeck } = refillBoard(
      remainingBoard.map((c) => c.card_code),
      room.deck
    );
    if (addedCodes.length) {
      await supabase.from("gyeolhap_board_cards").insert(
        addedCodes.map((code, i) => ({ room_id: room.id, position: maxPosition + 1 + i, card_code: code }))
      );
    }
    roomUpdate.deck = remainingDeck;
  } else {
    await supabase.from("gyeolhap_players").update({ score: player.score - 1 }).eq("id", player.id);
  }

  await supabase.from("gyeolhap_rooms").update(roomUpdate).eq("id", room.id);
}

// The DECLARE_SECONDS window after "합!" ran out without a submission — treated as a
// failed combo attempt (-1), same as a wrong guess.
export async function expireDeclare(room: GyeolhapRoom, players: GyeolhapPlayer[]) {
  if (room.phase !== "playing" || !room.declared_by || !room.sub_deadline) return;
  if (new Date(room.sub_deadline).getTime() > Date.now()) return;

  const declarerId = room.declared_by;
  const { data: claimed } = await supabase
    .from("gyeolhap_rooms")
    .update({ declared_by: null, sub_deadline: null, pass_streak: 0 })
    .eq("id", room.id)
    .eq("declared_by", declarerId)
    .eq("sub_deadline", room.sub_deadline)
    .select()
    .single();
  if (!claimed) return;

  const declarer = players.find((p) => p.id === declarerId);
  const otherPlayer = players.find((p) => p.id !== declarerId);
  if (!declarer || !otherPlayer) return;

  await supabase.from("gyeolhap_players").update({ score: declarer.score - 1 }).eq("id", declarer.id);
  await supabase
    .from("gyeolhap_rooms")
    .update({ turn_player_id: otherPlayer.id, turn_ends_at: decisionDeadline() })
    .eq("id", room.id);
}

// "결!" — declares the visible board has no combo left. Correct: +3 and the round ends
// immediately (a fresh round deals). Wrong: -1, same round continues, turn passes.
export async function declareDone(
  room: GyeolhapRoom,
  boardCards: GyeolhapBoardCard[],
  players: GyeolhapPlayer[],
  player: GyeolhapPlayer
) {
  if (room.phase !== "playing" || room.turn_player_id !== player.id || room.declared_by) return;
  const otherPlayer = players.find((p) => p.id !== player.id);
  if (!otherPlayer) return;

  const { data: claimed } = await supabase
    .from("gyeolhap_rooms")
    .update({ pass_streak: 0 })
    .eq("id", room.id)
    .eq("turn_player_id", player.id)
    .is("declared_by", null)
    .select()
    .single();
  if (!claimed) return;

  const correct = !hasAnyCombo(boardCards.map((c) => c.card_code));
  if (correct) {
    await supabase.from("gyeolhap_players").update({ score: player.score + 3 }).eq("id", player.id);
    await advanceRound(room, players);
  } else {
    await supabase.from("gyeolhap_players").update({ score: player.score - 1 }).eq("id", player.id);
    await supabase
      .from("gyeolhap_rooms")
      .update({ turn_player_id: otherPlayer.id, turn_ends_at: decisionDeadline() })
      .eq("id", room.id);
  }
}

// Voluntary immediate pass (player chooses not to wait out the full decision window).
export async function passTurn(room: GyeolhapRoom, players: GyeolhapPlayer[], player: GyeolhapPlayer) {
  if (room.phase !== "playing" || room.turn_player_id !== player.id || room.declared_by) return;
  const nextPassStreak = room.pass_streak + 1;

  const { data: claimed } = await supabase
    .from("gyeolhap_rooms")
    .update({ pass_streak: nextPassStreak })
    .eq("id", room.id)
    .eq("turn_player_id", player.id)
    .eq("pass_streak", room.pass_streak)
    .is("declared_by", null)
    .select()
    .single();
  if (!claimed) return;

  if (nextPassStreak >= PASS_STREAK_LIMIT) {
    await advanceRound(room, players);
    return;
  }
  const otherPlayer = players.find((p) => p.id !== player.id);
  if (!otherPlayer) return;
  await supabase
    .from("gyeolhap_rooms")
    .update({ turn_player_id: otherPlayer.id, turn_ends_at: decisionDeadline() })
    .eq("id", room.id);
}

// The DECISION_SECONDS window ran out with no 합/결 declared — an automatic pass.
export async function passOnDecisionTimeout(room: GyeolhapRoom, players: GyeolhapPlayer[]) {
  if (room.phase !== "playing" || room.declared_by) return;
  if (!room.turn_ends_at || !room.turn_player_id) return;
  if (new Date(room.turn_ends_at).getTime() > Date.now()) return;

  const nextPassStreak = room.pass_streak + 1;
  const { data: claimed } = await supabase
    .from("gyeolhap_rooms")
    .update({ pass_streak: nextPassStreak })
    .eq("id", room.id)
    .eq("turn_player_id", room.turn_player_id)
    .eq("turn_ends_at", room.turn_ends_at)
    .eq("pass_streak", room.pass_streak)
    .select()
    .single();
  if (!claimed) return;

  if (nextPassStreak >= PASS_STREAK_LIMIT) {
    await advanceRound(room, players);
    return;
  }
  const otherPlayer = players.find((p) => p.id !== room.turn_player_id);
  if (!otherPlayer) return;
  await supabase
    .from("gyeolhap_rooms")
    .update({ turn_player_id: otherPlayer.id, turn_ends_at: decisionDeadline() })
    .eq("id", room.id);
}

// Host-only: overtime rounds mean there's no automatic end once tied forever — let the
// host end the match manually whenever they want, higher score wins.
export async function endGame(room: GyeolhapRoom, players: GyeolhapPlayer[]) {
  if (room.phase !== "playing") return;
  const [a, b] = players;
  if (!a || !b) return;
  const winnerId = a.score === b.score ? null : a.score > b.score ? a.id : b.id;
  await supabase
    .from("gyeolhap_rooms")
    .update({ phase: "game_over", turn_player_id: null, turn_ends_at: null, winner_id: winnerId })
    .eq("id", room.id);
}

export async function resetRoom(room: GyeolhapRoom) {
  await supabase.from("gyeolhap_board_cards").delete().eq("room_id", room.id);
  await supabase.from("gyeolhap_players").update({ score: 0 }).eq("room_id", room.id);
  await supabase
    .from("gyeolhap_rooms")
    .update({
      phase: "lobby",
      round: 1,
      round_starter_id: null,
      pass_streak: 0,
      declared_by: null,
      sub_deadline: null,
      turn_player_id: null,
      turn_ends_at: null,
      winner_id: null,
    })
    .eq("id", room.id);
}
