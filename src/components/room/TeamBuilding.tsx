"use client";

import { useState } from "react";
import type { Player, Quest, Room } from "@/lib/actions";
import { proposeTeam } from "@/lib/actions";
import QuestTrack from "./QuestTrack";
import DiscussionTimer from "./DiscussionTimer";

export default function TeamBuilding({
  room,
  players,
  quests,
  quest,
  leader,
  me,
}: {
  room: Room;
  players: Player[];
  quests: Quest[];
  quest: Quest;
  leader: Player;
  me: Player;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const isLeader = leader.id === me.id;

  function toggle(playerId: string) {
    setSelected((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= quest.team_size) return prev;
      return [...prev, playerId];
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      await proposeTeam(quest, selected, room.id);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <QuestTrack room={room} quests={quests} playerCount={players.length} />
      <DiscussionTimer room={room} isHost={me.is_host} />

      <div className="text-center space-y-1">
        <p className="text-sm text-neutral-500">
          라운드 {room.round} · {quest.team_size}명 필요
        </p>
        <p className="text-lg font-medium">
          <span className="text-amber-500">{leader.nickname}</span>님이 원정대를 구성하고 있어요
        </p>
      </div>

      <ul className="space-y-1">
        {players.map((p) => {
          const isSelected = selected.includes(p.id);
          return (
            <li key={p.id}>
              <button
                disabled={!isLeader}
                onClick={() => toggle(p.id)}
                className={`w-full flex items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                  isSelected
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                    : "border-neutral-200 dark:border-neutral-800"
                } ${isLeader ? "cursor-pointer" : "cursor-default"}`}
              >
                <span>{p.nickname}</span>
                {isSelected && <span className="text-amber-500 text-xs">선택됨</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {isLeader ? (
        <button
          disabled={selected.length !== quest.team_size || submitting}
          onClick={submit}
          className="w-full rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-2.5 font-medium disabled:opacity-50"
        >
          {submitting ? "제출 중..." : `원정대 제안하기 (${selected.length}/${quest.team_size})`}
        </button>
      ) : (
        <p className="text-center text-sm text-neutral-500">리더가 원정대를 고를 때까지 기다려주세요...</p>
      )}
    </div>
  );
}
