"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRoom } from "@/hooks/useRoom";
import { removePlayerFromRoom } from "@/lib/actions";
import { clearSession, loadSession } from "@/lib/session";
import JoinForm from "./JoinForm";
import Lobby from "./Lobby";
import RoleReveal from "./RoleReveal";
import TeamBuilding from "./TeamBuilding";
import Voting from "./Voting";
import QuestPlay from "./QuestPlay";
import Assassinate from "./Assassinate";
import GameOver from "./GameOver";

export default function RoomClient({ roomCode }: { roomCode: string }) {
  const router = useRouter();
  const { room, players, quests, votes, questCards, loading, error, refetch } = useRoom(roomCode);
  const session = typeof window !== "undefined" ? loadSession(roomCode) : null;
  const me = players.find((p) => p.id === session?.playerId);
  const inRoom = Boolean(session && me);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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
    clearSession(roomCode);
    router.push("/");
  }

  const currentQuest = quests.length ? quests[quests.length - 1] : null;

  // Voting and quest resolution are both host-driven via an explicit "다음" button
  // (rather than auto-resolving) so the result screen has time to be read;
  // see Voting.tsx and QuestPlay.tsx.

  if (loading) {
    return <p className="text-center text-sm text-neutral-500 p-6">불러오는 중...</p>;
  }

  if (error || !room) {
    return <p className="text-center text-sm text-red-500 p-6">{error ?? "방을 찾을 수 없습니다."}</p>;
  }

  if (!session || !me) {
    return <JoinForm roomCode={roomCode} onJoined={refetch} />;
  }

  const leader = [...players].sort((a, b) => a.seat_order - b.seat_order)[room.leader_index];

  let content: React.ReactNode = null;
  switch (room.phase) {
    case "lobby":
      content = <Lobby room={room} players={players} isHost={me.is_host} />;
      break;
    case "reveal":
      content = <RoleReveal room={room} players={players} me={me} />;
      break;
    case "team_building":
      if (currentQuest && leader) {
        content = (
          <TeamBuilding room={room} players={players} quests={quests} quest={currentQuest} leader={leader} me={me} />
        );
      }
      break;
    case "voting":
      if (currentQuest && leader) {
        content = (
          <Voting
            room={room}
            players={players}
            quests={quests}
            quest={currentQuest}
            votes={votes.filter((v) => v.quest_id === currentQuest.id)}
            leader={leader}
            me={me}
          />
        );
      }
      break;
    case "quest":
      if (currentQuest) {
        content = (
          <QuestPlay
            room={room}
            players={players}
            quests={quests}
            quest={currentQuest}
            cards={questCards.filter((c) => c.quest_id === currentQuest.id)}
            me={me}
          />
        );
      }
      break;
    case "assassin":
      content = <Assassinate room={room} players={players} me={me} />;
      break;
    case "game_over":
      content = <GameOver room={room} players={players} me={me} />;
      break;
  }

  return (
    <>
      {content}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-sm space-y-4 rounded-lg bg-white dark:bg-neutral-900 p-5 shadow-lg">
            <div className="space-y-1">
              <p className="text-base font-medium">방을 나가시겠어요?</p>
              <p className="text-sm text-neutral-500">
                지금 나가면 진행 중인 게임에서 빠지게 돼요. 다시 들어오려면 방 코드가 필요합니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 py-2 text-sm font-medium"
              >
                계속 플레이
              </button>
              <button
                onClick={leaveRoom}
                className="flex-1 rounded-md bg-red-600 text-white py-2 text-sm font-medium"
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
