"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Room, Player, Quest, Vote, QuestCard } from "@/lib/actions";

export interface RoomData {
  room: Room | null;
  players: Player[];
  quests: Quest[];
  votes: Vote[];
  questCards: QuestCard[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRoom(roomCode: string): RoomData {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [questCards, setQuestCards] = useState<QuestCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const roomIdRef = useRef<string | null>(null);

  const fetchAll = useCallback(async () => {
    const { data: roomRow, error: roomError } = await supabase
      .from("rooms")
      .select()
      .eq("code", roomCode.toUpperCase())
      .single();
    if (roomError || !roomRow) {
      setError("방을 찾을 수 없습니다.");
      setLoading(false);
      return;
    }
    roomIdRef.current = roomRow.id;
    setRoom(roomRow);

    const [{ data: playerRows }, { data: questRows }] = await Promise.all([
      supabase.from("players").select().eq("room_id", roomRow.id).order("seat_order"),
      supabase.from("quests").select().eq("room_id", roomRow.id).order("created_at"),
    ]);
    setPlayers(playerRows ?? []);
    setQuests(questRows ?? []);

    const questIds = (questRows ?? []).map((q) => q.id);
    if (questIds.length) {
      const [{ data: voteRows }, { data: cardRows }] = await Promise.all([
        supabase.from("votes").select().in("quest_id", questIds),
        supabase.from("quest_cards").select().in("quest_id", questIds),
      ]);
      setVotes(voteRows ?? []);
      setQuestCards(cardRows ?? []);
    } else {
      setVotes([]);
      setQuestCards([]);
    }
    setError(null);
    setLoading(false);
  }, [roomCode]);

  useEffect(() => {
    // Initial sync with Supabase (external system), then subscribe for live updates below.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount is intentional here
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomCode.toUpperCase()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "quests" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "quest_cards" }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, fetchAll]);

  // Realtime can silently miss events (a join landing before the subscription finishes
  // connecting, a dropped websocket on mobile, a backgrounded tab). Two fallbacks catch those:
  // a periodic poll, and an immediate refetch when the tab/app regains focus or visibility.
  useEffect(() => {
    const interval = setInterval(() => fetchAll(), 5000);
    function handleVisible() {
      if (document.visibilityState === "visible") fetchAll();
    }
    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("focus", handleVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("focus", handleVisible);
    };
  }, [fetchAll]);

  return { room, players, quests, votes, questCards, loading, error, refetch: fetchAll };
}
