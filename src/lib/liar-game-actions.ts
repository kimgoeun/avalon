import { supabase } from "./supabase";
import type { Tables } from "./database.types";
import { MAX_PLAYERS, MIN_PLAYERS, type LiarMode, maxLiars, pickDifferentWord, pickRandomLiarIds, pickWord } from "./liar-game";

export type LiarRoom = Tables<"liar_rooms">;
export type LiarPlayer = Tables<"liar_players">;

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
      .from("liar_rooms")
      .insert({ code })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") continue;
      throw error;
    }
    const { data: player, error: playerError } = await supabase
      .from("liar_players")
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
    .from("liar_rooms")
    .select()
    .eq("code", code.toUpperCase())
    .single();
  if (error || !room) throw new Error("해당 코드의 방을 찾을 수 없습니다.");
  if (room.phase !== "lobby") throw new Error("이미 게임이 시작된 방입니다.");

  const { data: existingPlayers, error: playersError } = await supabase
    .from("liar_players")
    .select()
    .eq("room_id", room.id);
  if (playersError) throw playersError;
  if (existingPlayers.length >= MAX_PLAYERS) throw new Error(`최대 ${MAX_PLAYERS}명까지 참가할 수 있습니다.`);

  const { data: player, error: playerError } = await supabase
    .from("liar_players")
    .insert({ room_id: room.id, nickname, seat_order: existingPlayers.length, is_host: false })
    .select()
    .single();
  if (playerError) throw playerError;
  return { room, player };
}

export async function removePlayerFromRoom(player: LiarPlayer) {
  await supabase.from("liar_players").delete().eq("id", player.id);

  if (player.is_host) {
    const { data: remaining } = await supabase
      .from("liar_players")
      .select()
      .eq("room_id", player.room_id)
      .order("seat_order", { ascending: true })
      .limit(1);
    if (remaining && remaining.length) {
      await supabase.from("liar_players").update({ is_host: true }).eq("id", remaining[0].id);
    }
  }
}

export interface StartGameOptions {
  category: string;
  isCustomCategory: boolean;
  customWord?: string;
  customLiarWord?: string;
  liarCount: number;
  liarMode: LiarMode;
  showCategoryToLiar: boolean;
  manualLiarIds: string[] | null;
}

export async function startGame(room: LiarRoom, players: LiarPlayer[], options: StartGameOptions) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`${MIN_PLAYERS}~${MAX_PLAYERS}명이 필요합니다.`);
  }
  const allowedMax = maxLiars(players.length);
  if (options.liarCount < 1 || options.liarCount > allowedMax) {
    throw new Error(`라이어는 1~${allowedMax}명이어야 합니다.`);
  }

  let word: string;
  let liarWord: string | null = null;

  if (options.isCustomCategory) {
    if (!options.customWord?.trim()) throw new Error("제시어를 입력해주세요.");
    word = options.customWord.trim();
    if (options.liarMode === "fakeWord") {
      if (!options.customLiarWord?.trim()) throw new Error("라이어용 가짜 제시어를 입력해주세요.");
      liarWord = options.customLiarWord.trim();
    }
  } else {
    word = pickWord(options.category);
    if (options.liarMode === "fakeWord") {
      liarWord = pickDifferentWord(options.category, word);
    }
  }

  const liarIds =
    options.manualLiarIds && options.manualLiarIds.length === options.liarCount
      ? options.manualLiarIds
      : pickRandomLiarIds(
          players.map((p) => p.id),
          options.liarCount
        );

  await Promise.all(
    players.map((p) => supabase.from("liar_players").update({ is_liar: liarIds.includes(p.id) }).eq("id", p.id))
  );

  await supabase
    .from("liar_rooms")
    .update({
      phase: "discussion",
      category: options.category,
      word,
      liar_word: liarWord,
      liar_mode: options.liarMode,
      show_category_to_liar: options.showCategoryToLiar,
      liar_count: options.liarCount,
    })
    .eq("id", room.id);
}

export async function advanceToResult(roomId: string) {
  await supabase
    .from("liar_rooms")
    .update({ phase: "result", result_stage: "liar_reveal", winner: null })
    .eq("id", roomId);
}

// Step 1: was the liar correctly identified? If not, the liar wins outright — no need
// to check the word. If so, the liar gets a chance to guess the real word out loud —
// the word itself must stay hidden (from every screen, including the liar's own) until
// they've actually committed to a guess.
export async function markLiarCaught(roomId: string, caught: boolean) {
  if (caught) {
    await supabase.from("liar_rooms").update({ result_stage: "word_guess" }).eq("id", roomId);
  } else {
    await supabase.from("liar_rooms").update({ result_stage: "done", winner: "liar" }).eq("id", roomId);
  }
}

// Step 2: the liar has now said their guess out loud — reveal the real word so
// everyone can check it.
export async function revealWordForCheck(roomId: string) {
  await supabase.from("liar_rooms").update({ result_stage: "word_check" }).eq("id", roomId);
}

// Step 3: did the liar correctly guess the real word?
export async function markWordGuessed(roomId: string, guessedCorrectly: boolean) {
  await supabase
    .from("liar_rooms")
    .update({ result_stage: "done", winner: guessedCorrectly ? "liar" : "citizens" })
    .eq("id", roomId);
}

export async function resetRoom(room: LiarRoom, players: LiarPlayer[]) {
  await Promise.all(players.map((p) => supabase.from("liar_players").update({ is_liar: false }).eq("id", p.id)));
  await supabase
    .from("liar_rooms")
    .update({
      phase: "lobby",
      category: null,
      word: null,
      liar_word: null,
      result_stage: "liar_reveal",
      winner: null,
    })
    .eq("id", room.id);
}
