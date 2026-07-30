"use client";

import { useEffect, useState } from "react";
import type { GyeolhapBoardCard, GyeolhapPlayer, GyeolhapRoom } from "@/lib/gyeolhap-actions";
import {
  declareCombo,
  declareDone,
  endGame,
  expireDeclare,
  passOnDecisionTimeout,
  passTurn,
  submitCombo,
} from "@/lib/gyeolhap-actions";
import { MAX_ROUNDS } from "@/lib/gyeolhap";
import CardFace from "./CardFace";

export default function Board({
  room,
  players,
  boardCards,
  me,
}: {
  room: GyeolhapRoom;
  players: GyeolhapPlayer[];
  boardCards: GyeolhapBoardCard[];
  me: GyeolhapPlayer;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [decisionSec, setDecisionSec] = useState(0);
  const [declareSec, setDeclareSec] = useState(0);

  const isMyTurn = room.turn_player_id === me.id;
  const inDeclarePhase = room.declared_by !== null;
  const iAmDeclarer = room.declared_by === me.id;
  const opponent = players.find((p) => p.id !== me.id) ?? null;
  const turnPlayer = players.find((p) => p.id === room.turn_player_id) ?? null;
  const declarer = players.find((p) => p.id === room.declared_by) ?? null;

  useEffect(() => {
    setSelected([]);
  }, [room.turn_player_id, room.declared_by, room.round]);

  useEffect(() => {
    if (inDeclarePhase || !room.turn_ends_at) return;
    const endsAt = new Date(room.turn_ends_at).getTime();
    function tick() {
      setDecisionSec(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [room.turn_ends_at, inDeclarePhase]);

  useEffect(() => {
    if (!inDeclarePhase || !room.sub_deadline) return;
    const endsAt = new Date(room.sub_deadline).getTime();
    function tick() {
      setDeclareSec(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [room.sub_deadline, inDeclarePhase]);

  useEffect(() => {
    if (room.phase !== "playing") return;
    if (inDeclarePhase) {
      if (declareSec === 0) expireDeclare(room, players);
    } else {
      if (decisionSec === 0) passOnDecisionTimeout(room, players);
    }
  }, [decisionSec, declareSec, inDeclarePhase, room, players]);

  function toggleCard(id: string) {
    if (!iAmDeclarer || busy) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      setSelected([]);
    } finally {
      setBusy(false);
    }
  }

  const roundLabel =
    room.round > MAX_ROUNDS ? `연장전 ${room.round - MAX_ROUNDS}` : `라운드 ${room.round}/${MAX_ROUNDS}`;

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <div className="text-center">
        <p className="text-sm text-neutral-500">{roundLabel}</p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="text-center flex-1">
          <p className="text-sm text-neutral-500">{me.nickname} (나)</p>
          <p className="text-2xl font-bold">{me.score}</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-sm text-neutral-500">{opponent?.nickname ?? "상대"}</p>
          <p className="text-2xl font-bold">{opponent?.score ?? 0}</p>
        </div>
      </div>

      <div className="text-center space-y-1">
        {inDeclarePhase ? (
          <p className="text-lg font-medium">
            {iAmDeclarer ? "카드 3장을 골라 제출하세요!" : `${declarer?.nickname ?? "상대"}님이 합을 외쳤어요!`}
          </p>
        ) : (
          <p className="text-lg font-medium">
            {isMyTurn ? "내 차례예요" : `${turnPlayer?.nickname ?? "상대"}님의 차례`}
          </p>
        )}
        <p
          className={`text-3xl font-mono font-bold tabular-nums ${
            (inDeclarePhase ? declareSec : decisionSec) <= 3 ? "text-red-500" : ""
          }`}
        >
          0:{String(inDeclarePhase ? declareSec : decisionSec).padStart(2, "0")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {boardCards.map((c) => {
          const isSelected = selected.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              disabled={!iAmDeclarer || busy}
              onClick={() => toggleCard(c.id)}
              className={`rounded-2xl transition-all duration-150 ${
                isSelected
                  ? "-translate-y-1.5 ring-4 ring-indigo-400 shadow-lg shadow-indigo-500/20"
                  : "shadow-sm"
              } ${iAmDeclarer && !busy ? "cursor-pointer hover:-translate-y-1" : "cursor-default opacity-90"}`}
            >
              <CardFace code={c.card_code} />
            </button>
          );
        })}
      </div>

      {inDeclarePhase ? (
        iAmDeclarer && (
          <button
            disabled={selected.length !== 3 || busy}
            onClick={() => run(() => submitCombo(room, boardCards, players, me, selected))}
            className="w-full rounded-xl bg-indigo-600 text-white py-3.5 font-medium shadow-md shadow-indigo-500/25 transition hover:bg-indigo-500 disabled:opacity-40 disabled:shadow-none"
          >
            제출 ({selected.length}/3)
          </button>
        )
      ) : isMyTurn ? (
        <div className="grid grid-cols-3 gap-2">
          <button
            disabled={busy}
            onClick={() => run(() => declareCombo(room, me))}
            className="rounded-xl bg-indigo-600 text-white py-3 font-medium shadow-md shadow-indigo-500/25 transition hover:bg-indigo-500 disabled:opacity-40"
          >
            합!
          </button>
          <button
            disabled={busy}
            onClick={() => run(() => declareDone(room, boardCards, players, me))}
            className="rounded-xl border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-40"
          >
            결!
          </button>
          <button
            disabled={busy}
            onClick={() => run(() => passTurn(room, players, me))}
            className="rounded-xl border border-neutral-300 dark:border-neutral-700 py-3 font-medium text-neutral-500 disabled:opacity-40"
          >
            패스
          </button>
        </div>
      ) : (
        <p className="text-center text-base text-neutral-500">상대의 차례를 기다리는 중...</p>
      )}

      {me.is_host && (
        <button
          disabled={busy}
          onClick={() => run(() => endGame(room, players))}
          className="w-full text-center text-sm text-neutral-500 hover:underline disabled:opacity-40"
        >
          게임 종료하기
        </button>
      )}
    </div>
  );
}
