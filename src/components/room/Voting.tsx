"use client";

import { useState } from "react";
import type { Player, Quest, Room, Vote } from "@/lib/actions";
import { castVote, resolveVotesIfComplete } from "@/lib/actions";
import QuestTrack from "./QuestTrack";

export default function Voting({
  room,
  players,
  quests,
  quest,
  votes,
  leader,
  me,
}: {
  room: Room;
  players: Player[];
  quests: Quest[];
  quest: Quest;
  votes: Vote[];
  leader: Player;
  me: Player;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const myVote = votes.find((v) => v.player_id === me.id);
  const allVoted = votes.length >= players.length;
  const teamNicknames = players.filter((p) => quest.team_player_ids.includes(p.id)).map((p) => p.nickname);

  async function vote(approve: boolean) {
    setSubmitting(true);
    try {
      await castVote(quest.id, me.id, approve);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    setAdvancing(true);
    try {
      await resolveVotesIfComplete(room, players, quest, votes);
    } finally {
      setAdvancing(false);
    }
  }

  const approveCount = votes.filter((v) => v.approve).length;
  const rejectCount = votes.length - approveCount;

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <QuestTrack room={room} quests={quests} playerCount={players.length} />

      <div className="text-center space-y-1">
        <p className="text-base text-neutral-500">
          라운드 {room.round} · {leader.nickname}님의 원정대 제안
        </p>
        <p className="text-xl font-medium">{teamNicknames.join(", ")}</p>
      </div>

      {!allVoted ? (
        <>
          {myVote ? (
            <p className="text-center text-base text-neutral-500">
              투표 완료! 다른 사람들을 기다리는 중... ({votes.length}/{players.length})
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={submitting}
                onClick={() => vote(true)}
                className="rounded-md bg-blue-600 text-white py-4 font-medium disabled:opacity-50"
              >
                찬성
              </button>
              <button
                disabled={submitting}
                onClick={() => vote(false)}
                className="rounded-md bg-red-600 text-white py-4 font-medium disabled:opacity-50"
              >
                반대
              </button>
            </div>
          )}
          {!myVote && (
            <p className="text-center text-sm text-neutral-500">
              {votes.length}/{players.length}명 투표 완료
            </p>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-center text-base font-medium">
            찬성 {approveCount} · 반대 {rejectCount} —{" "}
            {approveCount > players.length / 2 ? "가결" : "부결"}
          </p>
          <ul className="space-y-1">
            {players.map((p) => {
              const v = votes.find((vote) => vote.player_id === p.id);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-base"
                >
                  <span>{p.nickname}</span>
                  <span className={v?.approve ? "text-blue-500" : "text-red-500"}>
                    {v?.approve ? "찬성" : "반대"}
                  </span>
                </li>
              );
            })}
          </ul>

          {me.is_host ? (
            <button
              disabled={advancing}
              onClick={handleNext}
              className="w-full rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium disabled:opacity-50"
            >
              {advancing ? "진행하는 중..." : "다음"}
            </button>
          ) : (
            <p className="text-center text-base text-neutral-500">방장이 다음으로 넘길 때까지 기다려주세요...</p>
          )}
        </div>
      )}
    </div>
  );
}
