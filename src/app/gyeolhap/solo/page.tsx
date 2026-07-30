"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ALL_CARD_CODES, MAX_ROUNDS, hasAnyCombo, isValidCombo, refillBoard, shuffle } from "@/lib/gyeolhap";
import CardFace from "@/components/gyeolhap/CardFace";

function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default function GyeolhapSoloPage() {
  const [board, setBoard] = useState<number[]>([]);
  const [deck, setDeck] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  function dealRound() {
    const shuffled = shuffle(ALL_CARD_CODES);
    const { addedCodes, remainingDeck } = refillBoard([], shuffled);
    setBoard(addedCodes);
    setDeck(remainingDeck);
    setSelected([]);
  }

  function startNewGame() {
    dealRound();
    setScore(0);
    setRound(1);
    setFinished(false);
    setStartedAt(Date.now());
    setElapsedSec(0);
    setFeedback(null);
  }

  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start exactly once on mount
  }, []);

  useEffect(() => {
    if (!startedAt || finished) return;
    const interval = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(interval);
  }, [startedAt, finished]);

  function flash(message: string) {
    setFeedback(message);
    setTimeout(() => setFeedback(null), 700);
  }

  function toggleCard(code: number) {
    if (finished) return;
    setSelected((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= 3) return prev;
      return [...prev, code];
    });
  }

  function submit() {
    if (selected.length !== 3) return;
    const valid = isValidCombo(selected);

    if (valid) {
      const remainingBoard = board.filter((c) => !selected.includes(c));
      const { addedCodes, remainingDeck } = refillBoard(remainingBoard, deck);
      setBoard([...remainingBoard, ...addedCodes]);
      setDeck(remainingDeck);
      setScore((s) => s + 1);
      flash("결합 성공! +1");
    } else {
      setScore((s) => s - 1);
      flash("결합이 아니에요 -1");
    }

    setSelected([]);
  }

  function declareDone() {
    if (!hasAnyCombo(board)) {
      setScore((s) => s + 3);
      flash("결! 정답이에요 +3");
      if (round >= MAX_ROUNDS) {
        setFinished(true);
      } else {
        setRound((r) => r + 1);
        dealRound();
      }
    } else {
      setScore((s) => s - 1);
      flash("결! 아직 남아있어요 -1");
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Link href="/gyeolhap" className="fixed top-4 left-4 text-sm text-neutral-500 hover:underline">
        ← 결합
      </Link>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">혼자하기</h1>
          <p className="text-base text-neutral-500">더 이상 결합이 없으면 &ldquo;결!&rdquo;을 외치세요</p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
          <div className="text-center flex-1">
            <p className="text-sm text-neutral-500">라운드</p>
            <p className="text-2xl font-bold">{round}/{MAX_ROUNDS}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-sm text-neutral-500">점수</p>
            <p className="text-2xl font-bold">{score}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-sm text-neutral-500">시간</p>
            <p className="text-2xl font-mono font-bold tabular-nums">{formatTime(elapsedSec)}</p>
          </div>
        </div>

        {finished ? (
          <div className="text-center space-y-4 rounded-2xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 p-6">
            <p className="text-3xl font-extrabold text-indigo-600">완료!</p>
            <p className="text-base text-neutral-600 dark:text-neutral-300">
              {MAX_ROUNDS}라운드를 {formatTime(elapsedSec)} 만에 {score}점으로 마쳤어요
            </p>
            <button
              onClick={startNewGame}
              className="w-full rounded-xl bg-indigo-600 text-white py-3.5 font-medium shadow-md shadow-indigo-500/25 transition hover:bg-indigo-500"
            >
              다시 하기
            </button>
          </div>
        ) : (
          <>
            {feedback && <p className="text-center text-lg font-medium text-indigo-600">{feedback}</p>}

            <div className="grid grid-cols-3 gap-3">
              {board.map((code) => {
                const isSelected = selected.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleCard(code)}
                    className={`rounded-2xl transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "-translate-y-1.5 ring-4 ring-indigo-400 shadow-lg shadow-indigo-500/20"
                        : "shadow-sm hover:-translate-y-1"
                    }`}
                  >
                    <CardFace code={code} />
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <button
                disabled={selected.length !== 3}
                onClick={submit}
                className="w-full rounded-xl bg-indigo-600 text-white py-3.5 font-medium shadow-md shadow-indigo-500/25 transition hover:bg-indigo-500 disabled:opacity-40 disabled:shadow-none"
              >
                결합 확인 ({selected.length}/3)
              </button>
              <button
                onClick={declareDone}
                className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 py-3 font-medium"
              >
                결! (더 이상 없어요)
              </button>
            </div>

            <button onClick={startNewGame} className="w-full text-center text-sm text-neutral-500 hover:underline">
              처음부터 다시 시작하기
            </button>
          </>
        )}
      </div>
    </main>
  );
}
