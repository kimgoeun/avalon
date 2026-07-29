"use client";

import { useState } from "react";
import type { Player, Room } from "@/lib/actions";
import { assassinate } from "@/lib/actions";
import { isEvil, Role } from "@/lib/avalon";

export default function Assassinate({ room, players, me }: { room: Room; players: Player[]; me: Player }) {
  const [target, setTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isAssassin = me.role === "assassin";
  const candidates = players.filter((p) => !isEvil(p.role as Role) && p.id !== me.id);

  async function confirm() {
    if (!target) return;
    setSubmitting(true);
    try {
      await assassinate(room, players, target);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAssassin) {
    return (
      <div className="w-full max-w-md mx-auto space-y-4 p-6 text-center">
        <p className="text-3xl font-bold">선 진영이 퀘스트 3개를 성공시켰습니다!</p>
        <p className="text-base text-neutral-500">암살자가 멀린을 찾고 있습니다...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <div className="text-center space-y-1">
        <p className="text-3xl font-bold">멀린을 지목하세요</p>
        <p className="text-base text-neutral-500">멀린을 맞추면 악당이 역전승합니다</p>
      </div>

      <ul className="space-y-1">
        {candidates.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => setTarget(p.id)}
              className={`w-full rounded-md border px-4 py-3 text-base ${
                target === p.id
                  ? "border-red-400 bg-red-50 dark:bg-red-950/30"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              {p.nickname}
            </button>
          </li>
        ))}
      </ul>

      <button
        disabled={!target || submitting}
        onClick={confirm}
        className="w-full rounded-md bg-red-600 text-white py-3.5 font-medium disabled:opacity-50"
      >
        {submitting ? "처리 중..." : "암살 확정"}
      </button>
    </div>
  );
}
