import { supabase } from "./supabase";
import type { Tables } from "./database.types";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  STARTING_CHIPS,
  STREETS_PER_HAND,
  CHIP_STEP,
  type BetUnit,
  buildActorQueue,
  computePotLayers,
  maxBetAmount,
  maxRaiseAmount,
  splitPot,
} from "./sevenpoker";

export type SevenPokerRoom = Tables<"sevenpoker_rooms">;
export type SevenPokerPlayer = Tables<"sevenpoker_players">;

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function seatOrderIds(players: SevenPokerPlayer[]): string[] {
  return [...players].sort((a, b) => a.seat_order - b.seat_order).map((p) => p.id);
}

export async function createRoom(nickname: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data: room, error } = await supabase
      .from("sevenpoker_rooms")
      .insert({ code })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") continue;
      throw error;
    }
    const { data: player, error: playerError } = await supabase
      .from("sevenpoker_players")
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
    .from("sevenpoker_rooms")
    .select()
    .eq("code", code.toUpperCase())
    .single();
  if (error || !room) throw new Error("해당 코드의 방을 찾을 수 없습니다.");
  if (room.phase !== "lobby") throw new Error("이미 게임이 시작된 방입니다.");

  const { data: existingPlayers, error: playersError } = await supabase
    .from("sevenpoker_players")
    .select()
    .eq("room_id", room.id);
  if (playersError) throw playersError;
  if (existingPlayers.length >= MAX_PLAYERS) throw new Error(`최대 ${MAX_PLAYERS}명까지 참가할 수 있습니다.`);

  const { data: player, error: playerError } = await supabase
    .from("sevenpoker_players")
    .insert({ room_id: room.id, nickname, seat_order: existingPlayers.length, is_host: false })
    .select()
    .single();
  if (playerError) throw playerError;
  return { room, player };
}

export async function removePlayerFromRoom(player: SevenPokerPlayer) {
  await supabase.from("sevenpoker_players").delete().eq("id", player.id);

  if (player.is_host) {
    const { data: remaining } = await supabase
      .from("sevenpoker_players")
      .select()
      .eq("room_id", player.room_id)
      .order("seat_order", { ascending: true })
      .limit(1);
    if (remaining && remaining.length) {
      await supabase.from("sevenpoker_players").update({ is_host: true }).eq("id", remaining[0].id);
    }
  }
}

export async function movePlayer(players: SevenPokerPlayer[], playerId: string, direction: "up" | "down") {
  const sorted = [...players].sort((a, b) => a.seat_order - b.seat_order);
  const idx = sorted.findIndex((p) => p.id === playerId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return;

  const a = sorted[idx];
  const b = sorted[swapIdx];
  await supabase.from("sevenpoker_players").update({ seat_order: -1 }).eq("id", a.id);
  await supabase.from("sevenpoker_players").update({ seat_order: a.seat_order }).eq("id", b.id);
  await supabase.from("sevenpoker_players").update({ seat_order: b.seat_order }).eq("id", a.id);
}

export async function startGame(room: SevenPokerRoom, players: SevenPokerPlayer[], betUnit: BetUnit) {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    throw new Error(`${MIN_PLAYERS}~${MAX_PLAYERS}명이 필요합니다.`);
  }

  await Promise.all(
    players.map((p) =>
      supabase
        .from("sevenpoker_players")
        .update({ chips: STARTING_CHIPS - betUnit, folded: false, all_in: false, street_contrib: betUnit })
        .eq("id", p.id)
    )
  );

  await supabase
    .from("sevenpoker_rooms")
    .update({
      phase: "select_first_actor",
      bet_unit: betUnit,
      hand_number: 1,
      street: 1,
      school_pot: 0,
      pot: players.length * betUnit,
      current_bet: 0,
      first_actor_id: null,
      pending_actors: [],
    })
    .eq("id", room.id);
}

// Host picks who acts first this street (based on the real cards on the table, which
// the app never sees). If nobody else is left who can actually act (everyone else is
// folded or all-in), skip straight to picking the street's winner.
export async function setFirstActor(room: SevenPokerRoom, players: SevenPokerPlayer[], firstActorId: string) {
  if (room.phase !== "select_first_actor") return;
  const seats = seatOrderIds(players);
  const exclude = new Set(players.filter((p) => p.folded || p.all_in).map((p) => p.id));
  const queue = buildActorQueue(seats, firstActorId, exclude);

  if (queue.length <= 1) {
    await supabase
      .from("sevenpoker_rooms")
      .update({ phase: "select_winner", first_actor_id: firstActorId, pending_actors: [] })
      .eq("id", room.id);
  } else {
    await supabase
      .from("sevenpoker_rooms")
      .update({ phase: "betting", first_actor_id: firstActorId, current_bet: 0, pending_actors: queue })
      .eq("id", room.id);
  }
}

function nextSeatAfter(seats: string[], playerId: string): string {
  const idx = seats.indexOf(playerId);
  return seats[(idx + 1) % seats.length];
}

async function advanceQueueOrCloseStreet(room: SevenPokerRoom, remainingQueue: string[], extraRoomFields: Partial<SevenPokerRoom> = {}) {
  if (remainingQueue.length === 0) {
    await supabase
      .from("sevenpoker_rooms")
      .update({ ...extraRoomFields, phase: "select_winner", pending_actors: [] })
      .eq("id", room.id);
  } else {
    await supabase
      .from("sevenpoker_rooms")
      .update({ ...extraRoomFields, pending_actors: remainingQueue })
      .eq("id", room.id);
  }
}

export async function checkAction(room: SevenPokerRoom, player: SevenPokerPlayer) {
  if (room.phase !== "betting" || room.pending_actors[0] !== player.id) return;
  if (room.street === 1) return; // rule 6: no check on the first betting street
  if (room.current_bet > player.street_contrib) return; // must call or fold instead
  await advanceQueueOrCloseStreet(room, room.pending_actors.slice(1));
}

export async function betAction(room: SevenPokerRoom, players: SevenPokerPlayer[], player: SevenPokerPlayer, amount: number) {
  if (room.phase !== "betting" || room.pending_actors[0] !== player.id) return;
  if (room.current_bet !== 0) return; // should call/raise instead

  const cap = Math.min(maxBetAmount(room.pot), player.chips);
  const amt = Math.max(CHIP_STEP, Math.min(Math.floor(amount / CHIP_STEP) * CHIP_STEP, cap));
  if (amt <= 0) return;
  const isAllIn = amt >= player.chips;

  await supabase
    .from("sevenpoker_players")
    .update({ chips: player.chips - amt, street_contrib: player.street_contrib + amt, all_in: isAllIn })
    .eq("id", player.id);

  // A bet reopens the action: anyone who already checked this street (and is still active)
  // needs another turn to respond, so rebuild the queue instead of just continuing it.
  const seats = seatOrderIds(players);
  const exclude = new Set([player.id, ...players.filter((p) => p.folded || p.all_in).map((p) => p.id)]);
  const queue = buildActorQueue(seats, nextSeatAfter(seats, player.id), exclude);

  await advanceQueueOrCloseStreet(room, queue, {
    pot: room.pot + amt,
    current_bet: player.street_contrib + amt,
  });
}

export async function callAction(room: SevenPokerRoom, player: SevenPokerPlayer) {
  if (room.phase !== "betting" || room.pending_actors[0] !== player.id) return;
  const owed = room.current_bet - player.street_contrib;
  if (owed <= 0) return; // nothing to call

  const amt = Math.min(owed, player.chips);
  const isAllIn = amt >= player.chips;

  await supabase
    .from("sevenpoker_players")
    .update({ chips: player.chips - amt, street_contrib: player.street_contrib + amt, all_in: isAllIn })
    .eq("id", player.id);

  await advanceQueueOrCloseStreet(room, room.pending_actors.slice(1), { pot: room.pot + amt });
}

export async function raiseAction(room: SevenPokerRoom, players: SevenPokerPlayer[], player: SevenPokerPlayer, raiseAmount: number) {
  if (room.phase !== "betting" || room.pending_actors[0] !== player.id) return;
  const owed = room.current_bet - player.street_contrib;
  if (owed <= 0) return; // nothing to raise over — should bet instead

  const potAfterCall = room.pot + owed;
  const cap = maxRaiseAmount(potAfterCall);
  const raiseAmt = Math.max(CHIP_STEP, Math.min(Math.floor(raiseAmount / CHIP_STEP) * CHIP_STEP, cap));
  const totalNeeded = owed + raiseAmt;
  if (totalNeeded <= 0 || player.chips < totalNeeded) return; // must be able to make a full raise

  await supabase
    .from("sevenpoker_players")
    .update({ chips: player.chips - totalNeeded, street_contrib: player.street_contrib + totalNeeded })
    .eq("id", player.id);

  const seats = seatOrderIds(players);
  const exclude = new Set([player.id, ...players.filter((p) => p.folded || p.all_in).map((p) => p.id)]);
  const queue = buildActorQueue(seats, nextSeatAfter(seats, player.id), exclude);

  await advanceQueueOrCloseStreet(room, queue, {
    pot: room.pot + totalNeeded,
    current_bet: room.current_bet + raiseAmt,
  });
}

export async function foldAction(room: SevenPokerRoom, players: SevenPokerPlayer[], player: SevenPokerPlayer) {
  if (room.phase !== "betting" || room.pending_actors[0] !== player.id) return;
  await supabase.from("sevenpoker_players").update({ folded: true }).eq("id", player.id);

  const stillActive = players.filter((p) => p.id !== player.id && !p.folded);
  if (stillActive.length <= 1) {
    await supabase.from("sevenpoker_rooms").update({ phase: "select_winner", pending_actors: [] }).eq("id", room.id);
    return;
  }
  await advanceQueueOrCloseStreet(room, room.pending_actors.slice(1));
}

export interface SettleStreetParams {
  room: SevenPokerRoom;
  players: SevenPokerPlayer[];
  /** One array of winner player ids per pot layer (same order as computePotLayers). */
  layerWinners: string[][];
  endGameRequested: boolean;
}

// Settles the current street: pays out each pot layer to its chosen winner(s). The main
// layer's winner leaves the 학교 unit behind (added to the accumulated school_pot) unless
// this is the game's final settlement (someone went all-in this street, or the host is
// ending the game now) — in that case there's no skim, and the accumulated school_pot is
// handed to the main layer's winner(s) on top of their share.
export async function settleStreet({ room, players, layerWinners, endGameRequested }: SettleStreetParams) {
  if (room.phase !== "select_winner") return;

  const contributions = players.map((p) => ({ playerId: p.id, amount: p.street_contrib, folded: p.folded }));
  const layers = computePotLayers(contributions);
  const anyAllIn = players.some((p) => p.all_in && !p.folded);
  const isFinal = anyAllIn || endGameRequested;

  const payouts: Record<string, number> = {};
  const addPayout = (id: string, amt: number) => {
    payouts[id] = (payouts[id] ?? 0) + amt;
  };

  layers.forEach((layer, i) => {
    const winners = (layerWinners[i] ?? []).filter((id) => layer.eligiblePlayerIds.includes(id));
    if (winners.length === 0) return;
    const isMainLayer = i === 0;
    const skim = isMainLayer && !isFinal ? Math.min(room.bet_unit, layer.amount) : 0;
    const split = splitPot(layer.amount - skim, winners);
    for (const [id, amt] of Object.entries(split)) addPayout(id, amt);
  });

  let newSchoolPot = room.school_pot;
  if (isFinal) {
    const mainWinners = (layerWinners[0] ?? []).filter((id) => layers[0]?.eligiblePlayerIds.includes(id));
    if (mainWinners.length > 0 && room.school_pot > 0) {
      const schoolSplit = splitPot(room.school_pot, mainWinners);
      for (const [id, amt] of Object.entries(schoolSplit)) addPayout(id, amt);
    }
    newSchoolPot = 0;
  } else {
    const mainLayerAmount = layers[0]?.amount ?? 0;
    newSchoolPot = room.school_pot + Math.min(room.bet_unit, mainLayerAmount);
  }

  await Promise.all(
    players.map((p) => {
      const gain = payouts[p.id] ?? 0;
      return supabase
        .from("sevenpoker_players")
        .update({ chips: p.chips + gain, street_contrib: 0 })
        .eq("id", p.id);
    })
  );

  if (isFinal) {
    await supabase
      .from("sevenpoker_rooms")
      .update({ phase: "game_over", pot: 0, current_bet: 0, school_pot: 0, pending_actors: [] })
      .eq("id", room.id);
    return;
  }

  const nextStreet = room.street + 1;
  if (nextStreet > STREETS_PER_HAND) {
    await Promise.all(players.map((p) => supabase.from("sevenpoker_players").update({ folded: false, all_in: false }).eq("id", p.id)));
    await supabase
      .from("sevenpoker_rooms")
      .update({
        phase: "select_first_actor",
        hand_number: room.hand_number + 1,
        street: 1,
        pot: 0,
        current_bet: 0,
        school_pot: newSchoolPot,
        first_actor_id: null,
        pending_actors: [],
      })
      .eq("id", room.id);
  } else {
    await supabase
      .from("sevenpoker_rooms")
      .update({
        phase: "select_first_actor",
        street: nextStreet,
        pot: 0,
        current_bet: 0,
        school_pot: newSchoolPot,
        first_actor_id: null,
        pending_actors: [],
      })
      .eq("id", room.id);
  }
}

export async function resetRoom(room: SevenPokerRoom, players: SevenPokerPlayer[]) {
  await Promise.all(
    players.map((p) =>
      supabase
        .from("sevenpoker_players")
        .update({ chips: STARTING_CHIPS, folded: false, all_in: false, street_contrib: 0 })
        .eq("id", p.id)
    )
  );
  await supabase
    .from("sevenpoker_rooms")
    .update({
      phase: "lobby",
      hand_number: 1,
      street: 1,
      school_pot: 0,
      pot: 0,
      current_bet: 0,
      first_actor_id: null,
      pending_actors: [],
    })
    .eq("id", room.id);
}
