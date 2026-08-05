"use client";

import { useState } from "react";
import type { SevenPokerPlayer, SevenPokerRoom } from "@/lib/sevenpoker-actions";
import {
  betAction,
  callAction,
  checkAction,
  foldAction,
  raiseAction,
  setFirstActor,
} from "@/lib/sevenpoker-actions";
import { formatWon, maxBetAmount, maxRaiseAmount, STREETS_PER_HAND } from "@/lib/sevenpoker";
import WinnerSelect from "./WinnerSelect";

export default function Table({
  room,
  players,
  me,
}: {
  room: SevenPokerRoom;
  players: SevenPokerPlayer[];
  me: SevenPokerPlayer;
}) {
  const active = players.filter((p) => !p.folded);
  const turnPlayerId = room.pending_actors[0] ?? null;
  const turnPlayer = players.find((p) => p.id === turnPlayerId) ?? null;

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      <div className="text-center">
        <p className="text-sm text-neutral-500">
          {room.hand_number}판째 · 스트리트 {room.street}/{STREETS_PER_HAND}
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
        <div className="text-center flex-1">
          <p className="text-sm text-neutral-500">팟</p>
          <p className="text-xl font-bold">{formatWon(room.pot)}</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-sm text-neutral-500">학교</p>
          <p className="text-xl font-bold text-amber-500">{formatWon(room.school_pot)}</p>
        </div>
      </div>

      <ul className="space-y-1">
        {players.map((p) => (
          <li
            key={p.id}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-base ${
              p.id === turnPlayerId
                ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30"
                : "border-neutral-200 dark:border-neutral-800"
            } ${p.folded ? "opacity-50" : ""}`}
          >
            <span className="flex items-center gap-2">
              <span>
                {p.nickname}
                {p.id === me.id && " (나)"}
              </span>
              {p.folded && <span className="text-xs text-neutral-400">폴드</span>}
              {p.all_in && !p.folded && <span className="text-xs text-red-500">올인</span>}
            </span>
            <span className="text-right">
              <span className="block font-bold">{formatWon(p.chips)}</span>
              {p.street_contrib > 0 && (
                <span className="block text-xs text-neutral-500">이번 스트리트 {formatWon(p.street_contrib)}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {room.phase === "select_first_actor" && (
        <FirstActorPicker room={room} active={active} me={me} />
      )}

      {room.phase === "betting" && (
        <BettingPanel room={room} players={players} me={me} turnPlayer={turnPlayer} />
      )}

      {room.phase === "select_winner" && <WinnerSelect room={room} players={players} me={me} />}
    </div>
  );
}

function FirstActorPicker({
  room,
  active,
  me,
}: {
  room: SevenPokerRoom;
  active: SevenPokerPlayer[];
  me: SevenPokerPlayer;
}) {
  const [busy, setBusy] = useState(false);

  async function pick(playerId: string) {
    setBusy(true);
    try {
      await setFirstActor(room, active, playerId);
    } finally {
      setBusy(false);
    }
  }

  if (!me.is_host) {
    return <p className="text-center text-base text-neutral-500">방장이 이번 스트리트의 선을 정하는 중이에요...</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-base font-medium">이번 스트리트의 선(먼저 행동할 사람)을 골라주세요</p>
      <div className="grid grid-cols-2 gap-2">
        {active.map((p) => (
          <button
            key={p.id}
            disabled={busy}
            onClick={() => pick(p.id)}
            className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-2.5 text-base disabled:opacity-50"
          >
            {p.nickname}
          </button>
        ))}
      </div>
    </div>
  );
}

function BettingPanel({
  room,
  players,
  me,
  turnPlayer,
}: {
  room: SevenPokerRoom;
  players: SevenPokerPlayer[];
  me: SevenPokerPlayer;
  turnPlayer: SevenPokerPlayer | null;
}) {
  const [busy, setBusy] = useState(false);
  const [betAmount, setBetAmount] = useState(room.bet_unit);
  const [raiseAmount, setRaiseAmount] = useState(room.bet_unit);

  const isMyTurn = turnPlayer?.id === me.id;
  const owed = room.current_bet - me.street_contrib;
  const canCheck = room.street > 1 && owed <= 0;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  if (!isMyTurn) {
    return (
      <p className="text-center text-base text-neutral-500">
        {turnPlayer?.nickname ?? "상대"}님의 차례예요...
      </p>
    );
  }

  if (room.current_bet === 0) {
    const cap = maxBetAmount(room.pot);
    return (
      <div className="space-y-3">
        <p className="text-center text-base font-medium">내 차례예요 — 최대 {formatWon(cap)}까지 베팅 가능</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step={500}
            min={500}
            max={cap}
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-400"
          />
          <button
            disabled={busy}
            onClick={() => run(() => betAction(room, players, me, betAmount))}
            className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-5 py-3 font-medium disabled:opacity-50"
          >
            베팅
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {canCheck && (
            <button
              disabled={busy}
              onClick={() => run(() => checkAction(room, me))}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50"
            >
              체크
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => run(() => foldAction(room, players, me))}
            className={`rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50 ${
              canCheck ? "" : "col-span-2"
            }`}
          >
            폴드
          </button>
        </div>
      </div>
    );
  }

  const potAfterCall = room.pot + owed;
  const raiseCap = maxRaiseAmount(potAfterCall);
  const canRaise = me.chips >= owed + 500;

  return (
    <div className="space-y-3">
      <p className="text-center text-base font-medium">내 차례예요 — 콜하려면 {formatWon(owed)}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={busy}
          onClick={() => run(() => callAction(room, me))}
          className="rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3 font-medium disabled:opacity-50"
        >
          콜 ({formatWon(owed)})
        </button>
        <button
          disabled={busy}
          onClick={() => run(() => foldAction(room, players, me))}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50"
        >
          폴드
        </button>
      </div>

      {canRaise && raiseCap >= 500 && (
        <div className="space-y-1">
          <p className="text-sm text-neutral-500">레이즈 (콜 {formatWon(owed)} + 최대 {formatWon(raiseCap)} 추가)</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={500}
              min={500}
              max={raiseCap}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(Number(e.target.value))}
              className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-400"
            />
            <button
              disabled={busy}
              onClick={() => run(() => raiseAction(room, players, me, raiseAmount))}
              className="rounded-lg bg-indigo-600 text-white px-5 py-3 font-medium disabled:opacity-50"
            >
              레이즈
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
