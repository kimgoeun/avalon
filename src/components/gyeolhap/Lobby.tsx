"use client";

import { useState } from "react";
import type { GyeolhapPlayer, GyeolhapRoom } from "@/lib/gyeolhap-actions";
import { startGame } from "@/lib/gyeolhap-actions";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/gyeolhap";

export default function Lobby({
  room,
  players,
  isHost,
}: {
  room: GyeolhapRoom;
  players: GyeolhapPlayer[];
  isHost: boolean;
}) {
  const [firstPlayerId, setFirstPlayerId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const count = players.length;
  const canStart = count >= MIN_PLAYERS && count <= MAX_PLAYERS;
  const chosenFirst = firstPlayerId ?? players[0]?.id ?? null;

  function pickRandom() {
    const pick = players[Math.floor(Math.random() * players.length)];
    if (pick) setFirstPlayerId(pick.id);
  }

  async function handleStart() {
    if (!chosenFirst) return;
    setStarting(true);
    try {
      await startGame(room, chosenFirst);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <div className="text-center space-y-1">
        <p className="text-base text-neutral-500">방 코드</p>
        <p className="text-5xl font-bold tracking-[0.3em]">{room.code}</p>
        <p className="text-sm text-neutral-500">이 코드를 상대에게 공유해서 초대하세요</p>
      </div>

      <div className="space-y-2">
        <p className="text-base font-medium">참가자 ({count}/{MAX_PLAYERS})</p>
        <ul className="space-y-1">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-base"
            >
              <span>{p.nickname}</span>
              {p.is_host && <span className="text-sm text-amber-500">방장</span>}
            </li>
          ))}
        </ul>
        {count < MIN_PLAYERS && (
          <p className="text-sm text-neutral-500">2명이 모이면 시작할 수 있어요 (1명 더 필요)</p>
        )}
      </div>

      {isHost ? (
        <div className="space-y-4">
          {canStart && (
            <div className="space-y-2">
              <p className="text-base font-medium">선공을 선택하세요</p>
              <div className="grid grid-cols-2 gap-2">
                {players.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFirstPlayerId(p.id)}
                    className={`rounded-lg border px-4 py-3 text-base transition ${
                      chosenFirst === p.id
                        ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30"
                        : "border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    {p.nickname}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={pickRandom}
                className="text-sm text-neutral-500 hover:underline"
              >
                무작위로 정하기
              </button>
            </div>
          )}

          <button
            disabled={!canStart || starting}
            onClick={handleStart}
            className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium disabled:opacity-50"
          >
            {starting ? "시작하는 중..." : "게임 시작"}
          </button>
        </div>
      ) : (
        <p className="text-center text-base text-neutral-500">방장이 게임을 시작할 때까지 기다려주세요...</p>
      )}
    </div>
  );
}
