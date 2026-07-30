"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiarRoom } from "@/hooks/useLiarRoom";
import { removePlayerFromRoom } from "@/lib/liar-game-actions";
import { clearSession, loadSession } from "@/lib/session";
import JoinForm from "./JoinForm";
import Lobby from "./Lobby";
import Discussion from "./Discussion";
import Result from "./Result";

export default function RoomClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { room, players, loading, error, refetch } = useLiarRoom(roomCode);
  const session = typeof window !== "undefined" ? loadSession(roomCode, "liar-game") : null;
  const me = players.find((p) => p.id === session?.playerId);
  const inRoom = Boolean(session && me);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  // Guard against an accidental back-navigation kicking the player out of the room:
  // push a buffer history entry, and if the user hits back, intercept it with a confirm dialog
  // instead of letting the browser actually navigate away.
  useEffect(() => {
    if (!inRoom) return;
    window.history.pushState(null, "", window.location.href);
    function handlePopState() {
      window.history.pushState(null, "", window.location.href);
      setShowLeaveConfirm(true);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [inRoom]);

  async function leaveRoom() {
    if (me) await removePlayerFromRoom(me);
    clearSession(roomCode, "liar-game");
    router.push("/liar-game");
  }

  if (loading) {
    return <p className="text-center text-base text-neutral-500 p-6">불러오는 중...</p>;
  }

  if (error || !room) {
    return <p className="text-center text-base text-red-500 p-6">{error ?? "방을 찾을 수 없습니다."}</p>;
  }

  if (!session || !me) {
    return <JoinForm roomCode={roomCode} onJoined={refetch} />;
  }

  let content: React.ReactNode = null;
  switch (room.phase) {
    case "lobby":
      content = <Lobby room={room} players={players} isHost={me.is_host} />;
      break;
    case "discussion":
      content = <Discussion room={room} me={me} />;
      break;
    case "result":
      content = <Result room={room} players={players} me={me} />;
      break;
  }

  return (
    <>
      <button
        type="button"
        aria-label="새로고침"
        onClick={handleRefresh}
        disabled={refreshing}
        className="fixed top-4 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-500 shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
      >
        <span className={refreshing ? "inline-block animate-spin" : "inline-block"}>↻</span>
      </button>
      {content}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-white dark:bg-neutral-900 p-5 shadow-lg">
            <div className="space-y-1">
              <p className="text-lg font-medium">방을 나가시겠어요?</p>
              <p className="text-base text-neutral-500">
                지금 나가면 진행 중인 게임에서 빠지게 돼요. 다시 들어오려면 방 코드가 필요합니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 text-base font-medium"
              >
                계속 플레이
              </button>
              <button
                onClick={leaveRoom}
                className="flex-1 rounded-lg bg-red-600 text-white py-3 text-base font-medium"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
