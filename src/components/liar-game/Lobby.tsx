"use client";

import { useState } from "react";
import type { LiarPlayer, LiarRoom } from "@/lib/liar-game-actions";
import { startGame } from "@/lib/liar-game-actions";
import { CATEGORY_NAMES, LIAR_MODE_LABEL, MAX_PLAYERS, MIN_PLAYERS, type LiarMode, maxLiars } from "@/lib/liar-game";

const CUSTOM = "__custom__";

export default function Lobby({
  room,
  players,
  isHost,
}: {
  room: LiarRoom;
  players: LiarPlayer[];
  isHost: boolean;
}) {
  const [category, setCategory] = useState<string>(CATEGORY_NAMES[0]);
  const [customWord, setCustomWord] = useState("");
  const [customLiarWord, setCustomLiarWord] = useState("");
  const [liarMode, setLiarMode] = useState<LiarMode>("category");
  const [showCategoryToLiar, setShowCategoryToLiar] = useState(true);
  const [liarCount, setLiarCount] = useState(1);
  const [assignMode, setAssignMode] = useState<"random" | "manual">("random");
  const [manualLiarIds, setManualLiarIds] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = players.length;
  const canStart = count >= MIN_PLAYERS && count <= MAX_PLAYERS;
  const allowedMaxLiars = canStart ? maxLiars(count) : 1;
  const isCustomCategory = category === CUSTOM;

  function toggleManualLiar(id: string) {
    setManualLiarIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= liarCount) return prev;
      return [...prev, id];
    });
  }

  async function handleStart() {
    setError(null);
    if (assignMode === "manual" && manualLiarIds.length !== liarCount) {
      setError(`라이어로 정확히 ${liarCount}명을 선택해주세요.`);
      return;
    }
    setStarting(true);
    try {
      await startGame(room, players, {
        category: isCustomCategory ? "사용자 지정" : category,
        isCustomCategory,
        customWord: isCustomCategory ? customWord : undefined,
        customLiarWord: isCustomCategory && liarMode === "fakeWord" ? customLiarWord : undefined,
        liarCount,
        liarMode,
        showCategoryToLiar,
        manualLiarIds: assignMode === "manual" ? manualLiarIds : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "게임을 시작하지 못했습니다.");
    } finally {
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
          <p className="text-sm text-neutral-500">최소 {MIN_PLAYERS}명이 필요합니다 ({MIN_PLAYERS - count}명 더 필요)</p>
        )}
      </div>

      {isHost ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-base font-medium">카테고리</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  className={`rounded-lg border px-2 py-2 text-sm transition ${
                    category === name
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  {name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCategory(CUSTOM)}
                className={`rounded-lg border px-2 py-2 text-sm transition ${
                  isCustomCategory
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                직접 입력
              </button>
            </div>

            {isCustomCategory && (
              <input
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-400"
                value={customWord}
                onChange={(e) => setCustomWord(e.target.value)}
                placeholder="제시어를 입력하세요"
                maxLength={20}
              />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-base font-medium">라이어 모드</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(LIAR_MODE_LABEL) as LiarMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setLiarMode(mode)}
                  className={`rounded-lg border px-3 py-2.5 text-sm transition ${
                    liarMode === mode
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  {LIAR_MODE_LABEL[mode]}
                </button>
              ))}
            </div>

            {liarMode === "category" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showCategoryToLiar}
                  onChange={(e) => setShowCategoryToLiar(e.target.checked)}
                />
                라이어에게 카테고리 보여주기
              </label>
            )}

            {liarMode === "fakeWord" && isCustomCategory && (
              <input
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-400"
                value={customLiarWord}
                onChange={(e) => setCustomLiarWord(e.target.value)}
                placeholder="라이어에게 보여줄 가짜 제시어"
                maxLength={20}
              />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-base font-medium">라이어 수</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLiarCount((n) => Math.max(1, n - 1))}
                className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 text-lg"
              >
                −
              </button>
              <span className="text-xl font-bold w-8 text-center">{liarCount}</span>
              <button
                type="button"
                onClick={() => setLiarCount((n) => Math.min(allowedMaxLiars, n + 1))}
                className="w-10 h-10 rounded-lg border border-neutral-300 dark:border-neutral-700 text-lg"
              >
                +
              </button>
              <span className="text-sm text-neutral-500">(최대 {allowedMaxLiars}명)</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-base font-medium">라이어 지정 방식</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAssignMode("random")}
                className={`rounded-lg border px-3 py-2.5 text-sm transition ${
                  assignMode === "random"
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                무작위로 정하기
              </button>
              <button
                type="button"
                onClick={() => setAssignMode("manual")}
                className={`rounded-lg border px-3 py-2.5 text-sm transition ${
                  assignMode === "manual"
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                직접 지정하기
              </button>
            </div>

            {assignMode === "manual" && (
              <div className="space-y-1">
                <p className="text-sm text-neutral-500">
                  라이어로 지정할 {liarCount}명을 선택하세요 ({manualLiarIds.length}/{liarCount})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {players.map((p) => {
                    const selected = manualLiarIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleManualLiar(p.id)}
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                          selected
                            ? "border-red-400 bg-red-50 dark:bg-red-950/30"
                            : "border-neutral-200 dark:border-neutral-800"
                        }`}
                      >
                        {p.nickname}
                      </button>
                    );
                  })}
                </div>
              </div>
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
