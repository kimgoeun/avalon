"use client";

import { useEffect, useRef, useState } from "react";
import type { SevenPokerPlayer, SevenPokerRoom } from "@/lib/sevenpoker-actions";
import {
  betAction,
  callAction,
  checkAction,
  foldAction,
  raiseAction,
  setFirstActor,
} from "@/lib/sevenpoker-actions";
import { CHIP_STEP, formatWon, maxBetAmount, maxRaiseAmount, streetLabel } from "@/lib/sevenpoker";
import WinnerSelect from "./WinnerSelect";
import { ChipAmountPicker, ChipStack } from "./Chips";

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

  const [toast, setToast] = useState<string | null>(null);
  const [winnerPreview, setWinnerPreview] = useState<string | null>(null);
  // undefined = baseline not established yet; null is a valid baseline (room has no
  // last_action at all, e.g. before anyone has acted this hand).
  const seenActionRef = useRef<string | null | undefined>(undefined);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const key = room.last_action_at;
    if (seenActionRef.current === undefined) {
      // First render: record whatever's already there as the baseline without toasting
      // it (it may have happened before this player joined/refreshed).
      seenActionRef.current = key;
      return;
    }
    if (key === seenActionRef.current || !key) return;
    seenActionRef.current = key;
    setToast(room.last_action);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2600);
  }, [room.last_action_at, room.last_action]);

  useEffect(() => {
    if (room.phase !== "select_winner") setWinnerPreview(null);
  }, [room.phase]);

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2 text-sm font-medium shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="text-center">
        <p className="text-sm text-neutral-500">
          {room.hand_number}판째 · {streetLabel(room.street)}
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-4 text-center space-y-1">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">테이블 위 판돈</p>
        <ChipStack amount={room.pot} size="md" />
        {winnerPreview && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{winnerPreview}</p>}
      </div>

      {room.phase === "select_first_actor" && (
        <FirstActorPicker room={room} active={active} me={me} />
      )}

      {room.phase === "betting" && (
        <BettingPanel room={room} players={players} me={me} turnPlayer={turnPlayer} />
      )}

      {room.phase === "select_winner" && (
        <WinnerSelect room={room} players={players} me={me} onWinnerPreview={setWinnerPreview} />
      )}

      <ul className="space-y-1">
        {players.map((p) => (
          <li
            key={p.id}
            className={`flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-base ${
              p.id === turnPlayerId
                ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30"
                : "border-neutral-200 dark:border-neutral-800"
            } ${p.folded ? "opacity-50" : ""}`}
          >
            <span className="flex flex-col">
              <span>
                {p.nickname}
                {p.id === me.id && " (나)"}
              </span>
              {p.folded && <span className="text-xs text-neutral-400">다이</span>}
              {p.all_in && !p.folded && <span className="text-xs text-red-500">올인</span>}
              {p.round_contrib > 0 && (
                <span className="text-xs text-neutral-500">이번 구 {formatWon(p.round_contrib)}</span>
              )}
            </span>
            <ChipStack amount={p.chips} size="sm" />
          </li>
        ))}
      </ul>
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
    return <p className="text-center text-base text-neutral-500">방장이 이번 구의 선을 정하는 중이에요...</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-base font-medium">이번 구의 선(먼저 행동할 사람)을 골라주세요</p>
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
  const owed = room.current_bet - me.round_contrib;
  const canCheck = room.street > 1 && owed <= 0;
  // The turn queue starts this street with one entry per still-in player and only
  // shrinks as people act, so if nothing's been removed yet, nobody's acted before me.
  const activeInQueueCount = players.filter((p) => !p.folded && !p.all_in).length;
  const isFirstToActThisStreet = room.pending_actors.length === activeInQueueCount;

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
    const cap = Math.max(CHIP_STEP, maxBetAmount(room.pot));
    const clampedBet = Math.min(Math.max(betAmount, CHIP_STEP), cap);

    if (canCheck && isFirstToActThisStreet) {
      // As 선, betting is the meaningful decision (there's nothing to "match" yet), so
      // it leads — checking and folding are secondary, plain buttons right below it.
      return (
        <div className="space-y-3">
          <p className="text-center text-base font-medium">내 차례예요 — 선 플레이어예요, 행동하세요</p>
          <ChipAmountPicker value={clampedBet} onChange={setBetAmount} min={CHIP_STEP} max={cap} />
          <button
            disabled={busy}
            onClick={() => run(() => betAction(room, players, me, clampedBet))}
            className="w-full rounded-lg bg-emerald-600 text-white py-3 font-medium disabled:opacity-50"
          >
            {formatWon(clampedBet)} 베팅
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={busy}
              onClick={() => run(() => checkAction(room, players, me))}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50"
            >
              체크
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => foldAction(room, players, me))}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50"
            >
              다이
            </button>
          </div>
        </div>
      );
    }

    if (canCheck) {
      // Someone before me already checked — matching that is 체크 콜, shown at the same
      // size/position a real call would have. Betting is opt-in below.
      return (
        <div className="space-y-3">
          <p className="text-center text-base font-medium">내 차례예요 — 앞사람이 체크했어요</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={busy}
              onClick={() => run(() => checkAction(room, players, me))}
              className="rounded-lg bg-emerald-600 text-white py-3 font-medium disabled:opacity-50"
            >
              체크 콜
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => foldAction(room, players, me))}
              className="rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50"
            >
              다이
            </button>
          </div>

          <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
            <p className="text-sm text-neutral-500 text-center">직접 베팅하기 (최대 {formatWon(cap)})</p>
            <ChipAmountPicker value={clampedBet} onChange={setBetAmount} min={CHIP_STEP} max={cap} />
            <button
              disabled={busy}
              onClick={() => run(() => betAction(room, players, me, clampedBet))}
              className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50"
            >
              {formatWon(clampedBet)} 베팅
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-center text-base font-medium">내 차례예요 — 최대 {formatWon(cap)}까지 베팅 가능</p>
        <ChipAmountPicker value={clampedBet} onChange={setBetAmount} min={CHIP_STEP} max={cap} />
        <button
          disabled={busy}
          onClick={() => run(() => betAction(room, players, me, clampedBet))}
          className="w-full rounded-lg bg-emerald-600 text-white py-3 font-medium disabled:opacity-50"
        >
          {formatWon(clampedBet)} 베팅
        </button>
        <button
          disabled={busy}
          onClick={() => run(() => foldAction(room, players, me))}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50"
        >
          다이
        </button>
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
          onClick={() => run(() => callAction(room, players, me))}
          className="rounded-lg bg-emerald-600 text-white py-3 font-medium disabled:opacity-50"
        >
          콜 ({formatWon(owed)})
        </button>
        <button
          disabled={busy}
          onClick={() => run(() => foldAction(room, players, me))}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50"
        >
          다이
        </button>
      </div>

      {canRaise && raiseCap >= 500 && (
        <div className="space-y-2">
          <p className="text-sm text-neutral-500 text-center">레이즈 (콜 {formatWon(owed)}에 추가로 얹을 금액)</p>
          <ChipAmountPicker
            value={Math.min(Math.max(raiseAmount, CHIP_STEP), raiseCap)}
            onChange={setRaiseAmount}
            min={CHIP_STEP}
            max={raiseCap}
          />
          <button
            disabled={busy}
            onClick={() =>
              run(() => raiseAction(room, players, me, Math.min(Math.max(raiseAmount, CHIP_STEP), raiseCap)))
            }
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 py-3 font-medium disabled:opacity-50"
          >
            (+) 레이즈
          </button>
        </div>
      )}
    </div>
  );
}
