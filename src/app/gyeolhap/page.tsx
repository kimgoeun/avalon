"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createRoom, joinRoom } from "@/lib/gyeolhap-actions";
import { saveSession } from "@/lib/session";

export default function GyeolhapHomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("join");
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
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
      if (mode === "create") {
        const { room, player } = await createRoom(nickname.trim());
        saveSession({ playerId: player.id, roomId: room.id, roomCode: room.code }, "gyeolhap");
        router.push(`/gyeolhap/room/${room.code}`);
      } else {
        if (!code.trim()) {
          setError("방 코드를 입력해주세요.");
          setLoading(false);
          return;
        }
        const { room, player } = await joinRoom(code.trim(), nickname.trim());
        saveSession({ playerId: player.id, roomId: room.id, roomCode: room.code }, "gyeolhap");
        router.push(`/gyeolhap/room/${room.code}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Link
        href="/"
        className="fixed top-4 left-4 text-sm text-neutral-500 hover:underline"
      >
        ← 게임 목록
      </Link>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">결합</h1>
          <p className="text-base text-neutral-500">둘이서 즐기는 결합(SET) 카드 대결</p>
        </div>

        <div className="flex rounded-xl border border-neutral-300 dark:border-neutral-700 overflow-hidden">
          <button
            className={`flex-1 py-3 text-base font-medium transition ${
              mode === "join"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-transparent"
            }`}
            onClick={() => setMode("join")}
            type="button"
          >
            참가하기
          </button>
          <button
            className={`flex-1 py-3 text-base font-medium transition ${
              mode === "create"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-transparent"
            }`}
            onClick={() => setMode("create")}
            type="button"
          >
            방 만들기
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-base font-medium">닉네임</label>
            <input
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-400"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 김철수"
              maxLength={12}
            />
          </div>

          {mode === "join" && (
            <div className="space-y-1">
              <label className="text-base font-medium">방 코드</label>
              <input
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-4 py-3 uppercase tracking-widest outline-none focus:ring-2 focus:ring-neutral-400"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="예: A1B2"
                maxLength={4}
              />
            </div>
          )}

          {error && <p className="text-base text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium disabled:opacity-50"
          >
            {loading ? "처리 중..." : mode === "create" ? "방 만들기" : "참가하기"}
          </button>
        </form>

        <p className="text-center text-sm text-neutral-500">2명이 함께 플레이할 수 있어요</p>

        <Link
          href="/gyeolhap/solo"
          className="block text-center text-sm text-neutral-500 hover:underline"
        >
          또는 혼자 연습하기 →
        </Link>
      </div>
    </main>
  );
}
