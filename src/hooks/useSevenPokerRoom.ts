"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SevenPokerRoom, SevenPokerPlayer } from "@/lib/sevenpoker-actions";

export interface SevenPokerRoomData {
  room: SevenPokerRoom | null;
  players: SevenPokerPlayer[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSevenPokerRoom(roomCode: string): SevenPokerRoomData {
  const [room, setRoom] = useState<SevenPokerRoom | null>(null);
  const [players, setPlayers] = useState<SevenPokerPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const roomIdRef = useRef<string | null>(null);

  const fetchAll = useCallback(async () => {
    const { data: roomRow, error: roomError } = await supabase
      .from("sevenpoker_rooms")
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

    const { data: playerRows } = await supabase
      .from("sevenpoker_players")
      .select()
      .eq("room_id", roomRow.id)
      .order("seat_order");
    setPlayers(playerRows ?? []);
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
      .channel(`sevenpoker-room-${roomCode.toUpperCase()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sevenpoker_rooms" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "sevenpoker_players" }, () => fetchAll())
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

  return { room, players, loading, error, refetch: fetchAll };
}
