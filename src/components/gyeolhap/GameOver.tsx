"use client";

import { useState } from "react";
import type { GyeolhapPlayer, GyeolhapRoom } from "@/lib/gyeolhap-actions";
import { resetRoom } from "@/lib/gyeolhap-actions";

export default function GameOver({
  room,
  players,
  me,
}: {
  room: GyeolhapRoom;
  players: GyeolhapPlayer[];
  me: GyeolhapPlayer;
}) {
  const [resetting, setResetting] = useState(false);
  const winner = players.find((p) => p.id === room.winner_id) ?? null;
  const iWon = winner?.id === me.id;
  const isTie = !room.winner_id;

  async function handleReset() {
    setResetting(true);
    try {
      await resetRoom(room);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <div
        className={`text-center rounded-2xl p-6 text-white ${
          isTie
            ? "bg-gradient-to-b from-neutral-600 to-neutral-800"
            : iWon
              ? "bg-gradient-to-b from-blue-700 to-blue-900"
              : "bg-gradient-to-b from-red-700 to-red-900"
        }`}
      >
        <p className="text-4xl font-bold">{isTie ? "무승부" : iWon ? "승리!" : "패배"}</p>
        {winner && <p className="text-base opacity-90 mt-1">{winner.nickname}님 승리</p>}
      </div>

      <ul className="space-y-1">
        {[...players]
          .sort((a, b) => b.score - a.score)
          .map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-base"
            >
              <span>
                {p.nickname}
                {p.id === me.id && " (나)"}
              </span>
              <span className="font-bold">{p.score}점</span>
            </li>
          ))}
      </ul>

      {me.is_host ? (
        <button
          disabled={resetting}
          onClick={handleReset}
          className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium disabled:opacity-50"
        >
          {resetting ? "초기화 중..." : "다시 대결하기"}
        </button>
      ) : (
        <p className="text-center text-base text-neutral-500">방장이 새 게임을 시작할 수 있어요</p>
      )}
    </div>
  );
}
