"use client";

import { useState } from "react";
import type { LiarPlayer, LiarRoom } from "@/lib/liar-game-actions";
import { resetRoom } from "@/lib/liar-game-actions";

export default function Result({
  room,
  players,
  me,
}: {
  room: LiarRoom;
  players: LiarPlayer[];
  me: LiarPlayer;
}) {
  const [resetting, setResetting] = useState(false);

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
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-center space-y-1">
        <p className="text-sm text-neutral-500">카테고리</p>
        <p className="text-lg font-medium">{room.category}</p>
        <p className="text-sm text-neutral-500 mt-3">진짜 제시어</p>
        <p className="text-3xl font-bold">{room.word}</p>
        {room.liar_mode === "fakeWord" && room.liar_word && (
          <>
            <p className="text-sm text-neutral-500 mt-3">라이어가 본 가짜 제시어</p>
            <p className="text-xl font-bold text-red-500">{room.liar_word}</p>
          </>
        )}
      </div>

      <ul className="space-y-1">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-base"
          >
            <span>
              {p.nickname}
              {p.id === me.id && " (나)"}
            </span>
            <span className={p.is_liar ? "text-red-500 font-medium" : "text-neutral-400"}>
              {p.is_liar ? "라이어" : "시민"}
            </span>
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
