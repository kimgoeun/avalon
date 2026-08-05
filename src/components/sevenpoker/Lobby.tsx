"use client";

import { useState } from "react";
import type { SevenPokerPlayer, SevenPokerRoom } from "@/lib/sevenpoker-actions";
import { movePlayer, startGame } from "@/lib/sevenpoker-actions";
import { BET_UNIT_OPTIONS, MAX_PLAYERS, MIN_PLAYERS, STARTING_CHIPS, type BetUnit, formatWon } from "@/lib/sevenpoker";

export default function Lobby({
  room,
  players,
  isHost,
}: {
  room: SevenPokerRoom;
  players: SevenPokerPlayer[];
  isHost: boolean;
}) {
  const [betUnit, setBetUnit] = useState<BetUnit>(500);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = players.length;
  const canStart = count >= MIN_PLAYERS && count <= MAX_PLAYERS;

  async function handleStart() {
    setError(null);
    setStarting(true);
    try {
      await startGame(room, players, betUnit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "게임을 시작하지 못했습니다.");
      setStarting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <div className="text-center space-y-1">
        <p className="text-base text-neutral-500">방 코드</p>
        <p className="text-5xl font-bold tracking-[0.3em]">{room.code}</p>
        <p className="text-sm text-neutral-500">
          모두 {formatWon(STARTING_CHIPS)}으로 시작해요. 카드는 오프라인으로 진행하고, 이 앱은 칩만 관리합니다.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-base font-medium">참가자 ({count}/{MAX_PLAYERS})</p>
        {isHost && (
          <p className="text-xs text-neutral-500">
            아래 순서대로 앉은 자리(배팅 순서)가 정해집니다. 화살표로 순서를 바꿀 수 있어요.
          </p>
        )}
        <ul className="space-y-1">
          {players.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-base"
            >
              <span className="flex items-center gap-2">
                <span className="text-sm text-neutral-400 w-4 text-right">{i + 1}</span>
                <span>{p.nickname}</span>
                {p.is_host && <span className="text-sm text-amber-500">방장</span>}
              </span>
              {isHost && (
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="위로"
                    disabled={i === 0}
                    onClick={() => movePlayer(players, p.id, "up")}
                    className="w-8 h-8 flex items-center justify-center rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="아래로"
                    disabled={i === players.length - 1}
                    onClick={() => movePlayer(players, p.id, "down")}
                    className="w-8 h-8 flex items-center justify-center rounded border border-neutral-300 dark:border-neutral-700 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {count < MIN_PLAYERS && (
          <p className="text-sm text-neutral-500">최소 {MIN_PLAYERS}명이 필요합니다 ({MIN_PLAYERS - count}명 더 필요)</p>
        )}
      </div>

      {isHost ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-base font-medium">학교(기본 배팅) 금액</p>
            <div className="grid grid-cols-2 gap-2">
              {BET_UNIT_OPTIONS.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => setBetUnit(unit)}
                  className={`rounded-lg border px-3 py-2.5 text-base transition ${
                    betUnit === unit
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  {formatWon(unit)}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-base text-red-500">{error}</p>}

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
