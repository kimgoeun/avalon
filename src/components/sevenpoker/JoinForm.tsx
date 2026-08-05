"use client";

import { useState } from "react";
import { joinRoom } from "@/lib/sevenpoker-actions";
import { saveSession } from "@/lib/session";

export default function JoinForm({ roomCode, onJoined }: { roomCode: string; onJoined: () => void }) {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { room, player } = await joinRoom(roomCode, nickname.trim());
      saveSession({ playerId: player.id, roomId: room.id, roomCode: room.code }, "sevenpoker");
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : "참가하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto p-6 space-y-4">
      <div className="text-center space-y-1">
        <p className="text-base text-neutral-500">방 코드</p>
        <p className="text-4xl font-bold tracking-[0.3em]">{roomCode}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-400"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임"
          maxLength={12}
        />
        {error && <p className="text-base text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium disabled:opacity-50"
        >
          {loading ? "참가하는 중..." : "참가하기"}
        </button>
      </form>
    </div>
  );
}
