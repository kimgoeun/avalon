"use client";

import { useState } from "react";
import type { Player, Quest, QuestCard, Room } from "@/lib/actions";
import { resolveQuestIfComplete, submitQuestCard } from "@/lib/actions";
import { isEvil, Role } from "@/lib/avalon";
import QuestTrack from "./QuestTrack";

export default function QuestPlay({
  room,
  players,
  quests,
  quest,
  cards,
  me,
}: {
  room: Room;
  players: Player[];
  quests: Quest[];
  quest: Quest;
  cards: QuestCard[];
  me: Player;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const onTeam = quest.team_player_ids.includes(me.id);
  const myCard = cards.find((c) => c.player_id === me.id);
  const allSubmitted = cards.length >= quest.team_size;
  const evil = isEvil(me.role as Role);
  const teamNicknames = players.filter((p) => quest.team_player_ids.includes(p.id)).map((p) => p.nickname);

  async function submit(success: boolean) {
    setSubmitting(true);
    try {
      await submitQuestCard(quest.id, me.id, success);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    setAdvancing(true);
    try {
      await resolveQuestIfComplete(room, players, quest, cards, quests);
    } finally {
      setAdvancing(false);
    }
  }

  const failCount = cards.filter((c) => !c.success).length;
  const successCount = cards.length - failCount;
  const questFailed = failCount >= quest.fails_required;

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <QuestTrack room={room} quests={quests} playerCount={players.length} />

      <div className="text-center space-y-1">
        <p className="text-sm text-neutral-500">라운드 {room.round} 퀘스트 진행 중</p>
        <p className="text-lg font-medium">{teamNicknames.join(", ")}</p>
      </div>

      {!allSubmitted ? (
        onTeam ? (
          myCard ? (
            <p className="text-center text-sm text-neutral-500">
              카드 제출 완료! 다른 원정대원들을 기다리는 중... ({cards.length}/{quest.team_size})
            </p>
          ) : evil ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={submitting}
                onClick={() => submit(true)}
                className="rounded-md bg-blue-600 text-white py-3 font-medium disabled:opacity-50"
              >
                성공 카드
              </button>
              <button
                disabled={submitting}
                onClick={() => submit(false)}
                className="rounded-md bg-red-600 text-white py-3 font-medium disabled:opacity-50"
              >
                실패 카드
              </button>
            </div>
          ) : (
            <button
              disabled={submitting}
              onClick={() => submit(true)}
              className="w-full rounded-md bg-blue-600 text-white py-3 font-medium disabled:opacity-50"
            >
              성공 카드 제출하기
            </button>
          )
        ) : (
          <p className="text-center text-sm text-neutral-500">
            퀘스트 원정대원들이 카드를 제출하는 중... ({cards.length}/{quest.team_size})
          </p>
        )
      ) : (
        <div
          className={`text-center space-y-4 rounded-xl border-2 p-5 ${
            questFailed
              ? "border-red-500 bg-red-50 dark:bg-red-950/30"
              : "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          }`}
        >
          <p className={`text-3xl font-extrabold ${questFailed ? "text-red-600" : "text-blue-600"}`}>
            {questFailed ? "퀘스트 실패" : "퀘스트 성공"}
          </p>

          <div className="flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1 rounded-lg bg-white dark:bg-neutral-900 px-5 py-3 shadow-sm">
              <span className="text-3xl font-bold text-blue-600">{successCount}</span>
              <span className="text-xs font-medium text-neutral-500">성공 카드</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-lg bg-white dark:bg-neutral-900 px-5 py-3 shadow-sm">
              <span className="text-3xl font-bold text-red-600">{failCount}</span>
              <span className="text-xs font-medium text-neutral-500">실패 카드</span>
            </div>
          </div>

          {me.is_host ? (
            <button
              disabled={advancing}
              onClick={handleNext}
              className="w-full rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-2.5 font-medium disabled:opacity-50"
            >
              {advancing ? "진행하는 중..." : "다음"}
            </button>
          ) : (
            <p className="text-center text-sm text-neutral-500">방장이 다음으로 넘길 때까지 기다려주세요...</p>
          )}
        </div>
      )}
    </div>
  );
}
