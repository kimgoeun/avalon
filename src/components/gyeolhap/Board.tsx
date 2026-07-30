"use client";

import { useEffect, useState } from "react";
import type { GyeolhapBoardCard, GyeolhapPlayer, GyeolhapRoom } from "@/lib/gyeolhap-actions";
import { claimCombo, passOnTimeout } from "@/lib/gyeolhap-actions";
import CardFace from "./CardFace";

export default function Board({
  room,
  players,
  boardCards,
  me,
}: {
  room: GyeolhapRoom;
  players: GyeolhapPlayer[];
  boardCards: GyeolhapBoardCard[];
  me: GyeolhapPlayer;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSec, setRemainingSec] = useState(0);

  const isMyTurn = room.turn_player_id === me.id;
  const opponent = players.find((p) => p.id !== me.id) ?? null;
  const turnPlayer = players.find((p) => p.id === room.turn_player_id) ?? null;

  useEffect(() => {
    setSelected([]);
  }, [room.turn_player_id, room.turn_ends_at]);

  useEffect(() => {
    if (!room.turn_ends_at) return;
    const endsAt = new Date(room.turn_ends_at).getTime();
    function tick() {
      setRemainingSec(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [room.turn_ends_at]);

  useEffect(() => {
    if (remainingSec > 0) return;
    if (room.phase !== "playing") return;
    passOnTimeout(room, players);
  }, [remainingSec, room, players]);

  function toggleCard(id: string) {
    if (!isMyTurn || submitting) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function handleClaim() {
    if (selected.length !== 3) return;
    setSubmitting(true);
    try {
      await claimCombo(room, boardCards, players, me, selected);
      setSelected([]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="text-center flex-1">
          <p className="text-sm text-neutral-500">{me.nickname} (나)</p>
          <p className="text-2xl font-bold">{me.score}</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-sm text-neutral-500">{opponent?.nickname ?? "상대"}</p>
          <p className="text-2xl font-bold">{opponent?.score ?? 0}</p>
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-lg font-medium">
          {isMyTurn ? "내 차례예요" : `${turnPlayer?.nickname ?? "상대"}님의 차례`}
        </p>
        <p className={`text-3xl font-mono font-bold tabular-nums ${remainingSec <= 10 ? "text-red-500" : ""}`}>
          0:{String(remainingSec).padStart(2, "0")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {boardCards.map((c) => {
          const isSelected = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              disabled={!isMyTurn || submitting}
              onClick={() => toggleCard(c.id)}
              className={`rounded-xl border-4 p-1 transition ${
                isSelected
                  ? "border-amber-400"
                  : "border-transparent"
              } ${isMyTurn ? "cursor-pointer" : "cursor-default"}`}
            >
              <CardFace code={c.card_code} />
            </button>
          );
        })}
      </div>

      {isMyTurn ? (
        <button
          disabled={selected.length !== 3 || submitting}
          onClick={handleClaim}
          className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium disabled:opacity-50"
        >
          {submitting ? "확인하는 중..." : `결합 선언! (${selected.length}/3)`}
        </button>
      ) : (
        <p className="text-center text-base text-neutral-500">상대가 결합을 찾는 중이에요...</p>
      )}
    </div>
  );
}
