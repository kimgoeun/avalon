"use client";

import { useState } from "react";
import type { SevenPokerPlayer, SevenPokerRoom } from "@/lib/sevenpoker-actions";
import { resetRoom } from "@/lib/sevenpoker-actions";
import { ChipStack } from "./Chips";

export default function GameOver({
  room,
  players,
  me,
}: {
  room: SevenPokerRoom;
  players: SevenPokerPlayer[];
  me: SevenPokerPlayer;
}) {
  const [resetting, setResetting] = useState(false);
  const ranked = [...players].sort((a, b) => b.chips - a.chips);

  async function handleReset() {
    setResetting(true);
    try {
      await resetRoom(room, players);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <div className="text-center rounded-2xl p-6 text-white bg-gradient-to-b from-amber-600 to-amber-800 space-y-1">
        <p className="text-4xl font-bold">최종 정산</p>
      </div>

      <ul className="space-y-1">
        {ranked.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-base"
          >
            <span className="flex items-center gap-2">
              <span className="text-sm text-neutral-400 w-4">{i + 1}</span>
              <span>
                {p.nickname}
                {p.id === me.id && " (나)"}
              </span>
            </span>
            <ChipStack amount={p.chips} size="sm" />
          </li>
        ))}
      </ul>

      {me.is_host ? (
        <button
          disabled={resetting}
          onClick={handleReset}
          className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium disabled:opacity-50"
        >
          {resetting ? "초기화 중..." : "이 방에서 새 게임 시작하기"}
        </button>
      ) : (
        <p className="text-center text-base text-neutral-500">방장이 새 게임을 시작할 수 있어요</p>
      )}
    </div>
  );
}
