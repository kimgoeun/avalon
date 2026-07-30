import { supabase } from "./supabase";
import type { Tables } from "./database.types";
import { ALL_CARD_CODES, TURN_SECONDS, hasAnyCombo, isValidCombo, refillBoard, shuffle } from "./gyeolhap";

export type GyeolhapRoom = Tables<"gyeolhap_rooms">;
export type GyeolhapPlayer = Tables<"gyeolhap_players">;
export type GyeolhapBoardCard = Tables<"gyeolhap_board_cards">;

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function turnDeadline(): string {
  return new Date(Date.now() + TURN_SECONDS * 1000).toISOString();
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
  const deckAll = shuffle(ALL_CARD_CODES);
  const { addedCodes, remainingDeck } = refillBoard([], deckAll);

  await supabase.from("gyeolhap_board_cards").insert(
    addedCodes.map((code, i) => ({ room_id: room.id, position: i, card_code: code }))
  );
  await supabase
    .from("gyeolhap_rooms")
    .update({
      phase: "playing",
      deck: remainingDeck,
      turn_player_id: firstPlayerId,
      turn_ends_at: turnDeadline(),
    })
    .eq("id", room.id);
}

export async function claimCombo(
  room: GyeolhapRoom,
  boardCards: GyeolhapBoardCard[],
  players: GyeolhapPlayer[],
  player: GyeolhapPlayer,
  selectedCardIds: string[]
) {
  if (room.phase !== "playing" || room.turn_player_id !== player.id) return;
  const selected = boardCards.filter((c) => selectedCardIds.includes(c.id));
  if (selected.length !== 3) return;

  const otherPlayer = players.find((p) => p.id !== player.id);
  if (!otherPlayer) return;

  const valid = isValidCombo(selected.map((c) => c.card_code));
  const maxPosition = boardCards.reduce((max, c) => Math.max(max, c.position), -1);

  let currentCodes: number[];
  if (valid) {
    await supabase.from("gyeolhap_board_cards").delete().in("id", selectedCardIds);
    await supabase
      .from("gyeolhap_players")
      .update({ score: player.score + 3 })
      .eq("id", player.id);
    currentCodes = boardCards.filter((c) => !selectedCardIds.includes(c.id)).map((c) => c.card_code);
  } else {
    currentCodes = boardCards.map((c) => c.card_code);
  }

  const { addedCodes, remainingDeck } = refillBoard(currentCodes, room.deck);
  if (addedCodes.length) {
    await supabase.from("gyeolhap_board_cards").insert(
      addedCodes.map((code, i) => ({ room_id: room.id, position: maxPosition + 1 + i, card_code: code }))
    );
  }

  const finalCodes = [...currentCodes, ...addedCodes];
  const gameOver = remainingDeck.length === 0 && !hasAnyCombo(finalCodes);

  if (gameOver) {
    const playerFinalScore = valid ? player.score + 3 : player.score;
    const winnerId =
      playerFinalScore > otherPlayer.score ? player.id : otherPlayer.score > playerFinalScore ? otherPlayer.id : null;
    await supabase
      .from("gyeolhap_rooms")
      .update({
        phase: "game_over",
        deck: remainingDeck,
        turn_player_id: null,
        turn_ends_at: null,
        winner_id: winnerId,
      })
      .eq("id", room.id);
  } else {
    await supabase
      .from("gyeolhap_rooms")
      .update({
        deck: remainingDeck,
        turn_player_id: otherPlayer.id,
        turn_ends_at: turnDeadline(),
      })
      .eq("id", room.id);
  }
}

export async function passOnTimeout(room: GyeolhapRoom, players: GyeolhapPlayer[]) {
  if (room.phase !== "playing" || !room.turn_ends_at || !room.turn_player_id) return;
  if (new Date(room.turn_ends_at).getTime() > Date.now()) return;

  const nextPlayer = players.find((p) => p.id !== room.turn_player_id);
  if (!nextPlayer) return;

  // Guard against both clients racing to resolve the same timeout: only the first
  // write (matching the exact stale turn_player_id/turn_ends_at) takes effect.
  await supabase
    .from("gyeolhap_rooms")
    .update({ turn_player_id: nextPlayer.id, turn_ends_at: turnDeadline() })
    .eq("id", room.id)
    .eq("turn_player_id", room.turn_player_id)
    .eq("turn_ends_at", room.turn_ends_at);
}

export async function resetRoom(room: GyeolhapRoom) {
  await supabase.from("gyeolhap_board_cards").delete().eq("room_id", room.id);
  await supabase.from("gyeolhap_players").update({ score: 0 }).eq("room_id", room.id);
  await supabase
    .from("gyeolhap_rooms")
    .update({
      phase: "lobby",
      deck: [],
      turn_player_id: null,
      turn_ends_at: null,
      winner_id: null,
    })
    .eq("id", room.id);
}
