"use client";

import { useState } from "react";
import type { Player, Room } from "@/lib/actions";
import { movePlayer, startGame } from "@/lib/actions";
import {
  DEFAULT_ROLE_OPTIONS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  QUEST_CONFIGS,
  RoleOptions,
  ROLE_LABEL,
} from "@/lib/avalon";

export default function Lobby({ room, players, isHost }: { room: Room; players: Player[]; isHost: boolean }) {
  const [options, setOptions] = useState<RoleOptions>(DEFAULT_ROLE_OPTIONS);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = players.length;
  const canStart = count >= MIN_PLAYERS && count <= MAX_PLAYERS;
  const evilCount = QUEST_CONFIGS[count]?.evilCount;
  const optionalSlots = evilCount ? evilCount - 1 : 0;
  const selectedOptionalCount = [options.morgana, options.mordred, options.oberon].filter(Boolean).length;

  function toggle(key: keyof RoleOptions) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleStart() {
    setError(null);
    if (optionalSlots !== undefined && selectedOptionalCount > optionalSlots) {
      setError(`이 인원수에서는 악당 특수 역할을 최대 ${optionalSlots}개까지만 선택할 수 있습니다.`);
      return;
    }
    setStarting(true);
    try {
      await startGame(room, players, options);
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
        <p className="text-sm text-neutral-500">이 코드를 다른 사람에게 공유해서 초대하세요</p>
      </div>

      <div className="space-y-2">
        <p className="text-base font-medium">참가자 ({count}/{MAX_PLAYERS})</p>
        {isHost && (
          <p className="text-sm text-neutral-500">
            아래 순서대로 원정대장(리더)이 돌아가며 원정대를 구성합니다. 화살표로 순서를 바꿀 수 있어요.
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
                    className="w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="아래로"
                    disabled={i === players.length - 1}
                    onClick={() => movePlayer(players, p.id, "down")}
                    className="w-8 h-8 flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 disabled:opacity-30"
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
            <p className="text-base font-medium">역할 옵션</p>
            <div className="grid grid-cols-2 gap-2 text-base">
              <RoleToggle label={ROLE_LABEL.merlin} checked disabled />
              <RoleToggle label={ROLE_LABEL.assassin} checked disabled />
              <RoleToggle label={ROLE_LABEL.percival} checked={options.percival} onChange={() => toggle("percival")} />
              <RoleToggle label={ROLE_LABEL.morgana} checked={options.morgana} onChange={() => toggle("morgana")} />
              <RoleToggle label={ROLE_LABEL.mordred} checked={options.mordred} onChange={() => toggle("mordred")} />
              <RoleToggle label={ROLE_LABEL.oberon} checked={options.oberon} onChange={() => toggle("oberon")} />
            </div>
            {evilCount !== undefined && (
              <p className="text-sm text-neutral-500">
                악당 특수 역할 {selectedOptionalCount}/{optionalSlots}개 선택됨 (모르가나·모드레드·오베론 중)
              </p>
            )}
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

function RoleToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange?: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 ${
        disabled ? "opacity-50 cursor-default" : "cursor-pointer"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      {label}
    </label>
  );
}
