"use client";

import { useState } from "react";
import type { LiarPlayer, LiarRoom } from "@/lib/liar-game-actions";
import { markLiarCaught, markWordGuessed, resetRoom } from "@/lib/liar-game-actions";

export default function Result({
  room,
  players,
  me,
}: {
  room: LiarRoom;
  players: LiarPlayer[];
  me: LiarPlayer;
}) {
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  function reveal(playerId: string) {
    setRevealed((prev) => new Set(prev).add(playerId));
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const stage = room.result_stage;

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      {room.liar_mode === "fakeWord" && room.liar_word && (
        <p className="text-center text-sm text-neutral-500">라이어가 본 가짜 제시어: {room.liar_word}</p>
      )}

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
            {revealed.has(p.id) ? (
              <span className={p.is_liar ? "text-red-500 font-medium" : "text-neutral-400"}>
                {p.is_liar ? "라이어" : "시민"}
              </span>
            ) : (
              <button
                onClick={() => reveal(p.id)}
                className="text-sm px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700"
              >
                역할 확인
              </button>
            )}
          </li>
        ))}
      </ul>

      {stage === "liar_reveal" && (
        <div className="space-y-3">
          <p className="text-center text-base font-medium">여러분이 라이어를 정확히 찾아냈나요?</p>
          {me.is_host ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={busy}
                onClick={() => run(() => markLiarCaught(room.id, false))}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50"
              >
                못 찾았어요
              </button>
              <button
                disabled={busy}
                onClick={() => run(() => markLiarCaught(room.id, true))}
                className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3 font-medium disabled:opacity-50"
              >
                찾았어요
              </button>
            </div>
          ) : (
            <p className="text-center text-base text-neutral-500">방장이 결과를 진행 중이에요...</p>
          )}
        </div>
      )}

      {stage === "word_check" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-center space-y-1">
            <p className="text-sm text-neutral-500">진짜 제시어</p>
            <p className="text-3xl font-bold">{room.word}</p>
          </div>
          <p className="text-center text-base font-medium">라이어가 제시어를 맞췄나요?</p>
          {me.is_host ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={busy}
                onClick={() => run(() => markWordGuessed(room.id, false))}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50"
              >
                못 맞췄어요
              </button>
              <button
                disabled={busy}
                onClick={() => run(() => markWordGuessed(room.id, true))}
                className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3 font-medium disabled:opacity-50"
              >
                맞췄어요
              </button>
            </div>
          ) : (
            <p className="text-center text-base text-neutral-500">방장이 결과를 진행 중이에요...</p>
          )}
        </div>
      )}

      {stage === "done" && (
        <ResetPanel room={room} players={players} me={me} />
      )}
    </div>
  );
}

function ResetPanel({
  room,
  players,
  me,
}: {
  room: LiarRoom;
  players: LiarPlayer[];
  me: LiarPlayer;
}) {
  const [resetting, setResetting] = useState(false);
  const liarWon = room.winner === "liar";

  async function handleReset() {
    setResetting(true);
    try {
      await resetRoom(room, players);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`text-center rounded-2xl p-6 text-white space-y-1 ${
          liarWon ? "bg-gradient-to-b from-red-700 to-red-900" : "bg-gradient-to-b from-blue-700 to-blue-900"
        }`}
      >
        <p className="text-4xl font-bold">{liarWon ? "라이어 승리!" : "시민 승리!"}</p>
      </div>

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 text-center space-y-1">
        <p className="text-sm text-neutral-500">카테고리</p>
        <p className="text-lg font-medium">{room.category}</p>
        <p className="text-sm text-neutral-500 mt-3">진짜 제시어</p>
        <p className="text-3xl font-bold">{room.word}</p>
      </div>

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
