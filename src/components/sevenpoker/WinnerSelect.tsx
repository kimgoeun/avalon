"use client";

import { useEffect, useState } from "react";
import type { SevenPokerPlayer, SevenPokerRoom } from "@/lib/sevenpoker-actions";
import { settleHand } from "@/lib/sevenpoker-actions";
import { computePotLayers, formatWon } from "@/lib/sevenpoker";

export default function WinnerSelect({
  room,
  players,
  me,
  onWinnerPreview,
}: {
  room: SevenPokerRoom;
  players: SevenPokerPlayer[];
  me: SevenPokerPlayer;
  onWinnerPreview?: (text: string | null) => void;
}) {
  const layers = computePotLayers(
    players.map((p) => ({ playerId: p.id, amount: p.street_contrib, folded: p.folded, allIn: p.all_in }))
  );
  const nicknameById = new Map(players.map((p) => [p.id, p.nickname]));
  const anyAllIn = players.some((p) => p.all_in && !p.folded);

  const [selections, setSelections] = useState<string[][]>(() => layers.map(() => []));
  const [endGameRequested, setEndGameRequested] = useState(false);
  const [busy, setBusy] = useState(false);

  function toggleWinner(layerIndex: number, playerId: string) {
    setSelections((prev) => {
      const next = prev.map((arr) => [...arr]);
      const layer = next[layerIndex];
      const idx = layer.indexOf(playerId);
      if (idx >= 0) layer.splice(idx, 1);
      else layer.push(playerId);
      return next;
    });
  }

  const isFinal = anyAllIn || endGameRequested;
  const canSubmit = layers.length > 0 && layers.every((_, i) => selections[i].length > 0);
  const anteTotal = players.length * room.bet_unit;

  // Mirror the main layer's pick up to the table's 판돈 card, so it's obvious there
  // that the pot is about to move once a winner is chosen.
  useEffect(() => {
    if (!onWinnerPreview) return;
    const mainLayer = layers[0];
    const winners = selections[0] ?? [];
    if (!mainLayer || winners.length === 0) {
      onWinnerPreview(null);
      return;
    }
    const skim = !isFinal ? Math.min(anteTotal, mainLayer.amount) : 0;
    const nicknameById = new Map(players.map((p) => [p.id, p.nickname]));
    const winnerNames = winners.map((id) => nicknameById.get(id)).filter(Boolean).join(", ");
    onWinnerPreview(`${winnerNames}님 승리, ${skim > 0 ? "학교 제외 " : ""}${formatWon(mainLayer.amount - skim)} 지급`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selections[0] is the real trigger; layers/players are derived from room state each render
  }, [selections, layers, isFinal, anteTotal, onWinnerPreview]);

  async function handleSubmit() {
    setBusy(true);
    try {
      await settleHand({ room, players, layerWinners: selections, endGameRequested });
    } finally {
      setBusy(false);
    }
  }

  if (me.id !== room.dealer_id) {
    return <p className="text-center text-base text-neutral-500">딜러가 이번 판의 승자를 정하는 중이에요...</p>;
  }

  if (layers.length === 0) {
    // Shouldn't normally happen (the ante guarantees every hand has money in it), but
    // kept as a defensive fallback.
    return (
      <div className="space-y-3">
        <p className="text-center text-base text-neutral-500">이번 판에는 배팅이 없었어요.</p>
        <button
          disabled={busy}
          onClick={() => handleSubmit()}
          className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium disabled:opacity-50"
        >
          다음으로
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {layers.map((layer, i) => {
        const skim = i === 0 && !isFinal ? Math.min(anteTotal, layer.amount) : 0;
        const winners = selections[i] ?? [];
        const winnerNames = winners.map((id) => nicknameById.get(id)).filter(Boolean).join(", ");

        return (
        <div key={i} className="space-y-2">
          <p className="text-base font-medium">
            {winners.length > 0
              ? `${winnerNames}님 승리, ${skim > 0 ? "학교 제외 " : ""}${formatWon(layer.amount - skim)} 지급`
              : `${layers.length === 1 ? "이번 판 승자" : i === 0 ? "메인팟 승자" : `사이드팟 ${i} 승자`} (${formatWon(layer.amount)}${
                  skim > 0 ? ` — 학교 ${formatWon(skim)} 남기고 지급` : ""
                })`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {layer.eligiblePlayerIds.map((id) => {
              const selected = selections[i]?.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleWinner(i, id)}
                  className={`rounded-lg border px-3 py-2.5 text-base transition ${
                    selected
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  {nicknameById.get(id) ?? "?"}
                </button>
              );
            })}
          </div>
        </div>
        );
      })}

      {anyAllIn ? (
        <p className="text-center text-sm text-amber-500">
          누군가 올인했어요 — 이번 판이 끝나면 학교 없이 팟 전액을 정산하고 게임이 종료됩니다.
        </p>
      ) : (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={endGameRequested}
            onChange={(e) => setEndGameRequested(e.target.checked)}
          />
          이번 판을 마지막으로 하고 게임 종료하기 (학교 없이 팟 전액을 메인팟 승자에게 지급)
        </label>
      )}

      <button
        disabled={!canSubmit || busy}
        onClick={handleSubmit}
        className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium disabled:opacity-50"
      >
        {busy ? "정산하는 중..." : "정산하기"}
      </button>
    </div>
  );
}
