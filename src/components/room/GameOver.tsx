"use client";

import { useState } from "react";
import type { Player, Room } from "@/lib/actions";
import { resetRoom } from "@/lib/actions";
import { isEvil, Role, ROLE_LABEL } from "@/lib/avalon";

const REASON_LABEL: Record<string, string> = {
  three_successes: "선 진영이 퀘스트 3개를 성공시켰습니다",
  three_fails: "악당 진영이 퀘스트 3개를 실패시켰습니다",
  five_rejections: "원정대 제안이 5번 연속 부결되었습니다",
  assassin_found_merlin: "암살자가 멀린을 정확히 지목했습니다",
  assassin_missed_merlin: "암살자가 멀린을 찾지 못했습니다",
};

export default function GameOver({ room, players, me }: { room: Room; players: Player[]; me: Player }) {
  const [resetting, setResetting] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const goodWon = room.winner === "good";

  function reveal(playerId: string) {
    setRevealed((prev) => new Set(prev).add(playerId));
  }

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
      <div
        className={`text-center rounded-2xl p-6 text-white ${
          goodWon ? "bg-gradient-to-b from-blue-700 to-blue-900" : "bg-gradient-to-b from-red-700 to-red-900"
        }`}
      >
        <p className="text-4xl font-bold">{goodWon ? "선 진영 승리" : "악당 진영 승리"}</p>
        <p className="text-base opacity-90 mt-1">{room.win_reason ? REASON_LABEL[room.win_reason] : ""}</p>
      </div>

      <div className="space-y-2">
        <p className="text-base font-medium">전체 역할 공개</p>
        <ul className="space-y-1">
          {players.map((p) => {
            const evil = isEvil(p.role as Role);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-base"
              >
                <span>{p.nickname}</span>
                {revealed.has(p.id) ? (
                  <span className={evil ? "text-red-500" : "text-blue-500"}>
                    {p.role ? ROLE_LABEL[p.role as Role] : "-"}
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
            );
          })}
        </ul>
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
