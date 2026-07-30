"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MAX_ROUNDS, comboKey, dealBoard, findAllCombos, isValidCombo } from "@/lib/gyeolhap";
import CardFace from "@/components/gyeolhap/CardFace";

function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default function GyeolhapSoloPage() {
  const [board, setBoard] = useState<number[]>([]);
  const [foundSets, setFoundSets] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [finished, setFinished] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  function dealRound() {
    setBoard(dealBoard());
    setFoundSets([]);
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
    setTimeout(() => setFeedback(null), 1800);
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
    const key = comboKey(selected);
    const success = isValidCombo(selected) && !foundSets.includes(key);

    if (success) {
      setFoundSets((prev) => [...prev, key]);
      setScore((s) => s + 1);
      flash("결합 성공! +1");
    } else {
      setScore((s) => s - 1);
      flash("결합이 아니에요 -1");
    }

    setSelected([]);
  }

  function declareDone() {
    const allCombos = findAllCombos(board);
    const correct = allCombos.every((key) => foundSets.includes(key));

    if (correct) {
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

  const foundRows = foundSets.map((key) => key.split("-").map(Number));

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Link href="/gyeolhap" className="fixed top-4 left-4 text-sm text-neutral-500 hover:underline">
        ← 결합
      </Link>

      <div className="w-full max-w-md space-y-6">
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
            <p className="h-7 text-center text-lg font-medium text-indigo-600">{feedback}</p>

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

            {foundRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-neutral-500">이번 라운드에서 찾은 합 ({foundRows.length})</p>
                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {foundRows.map((codes, i) => (
                    <div key={i} className="flex gap-1.5">
                      {codes.map((code) => (
                        <div key={code} className="w-10">
                          <CardFace code={code} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={startNewGame} className="w-full text-center text-sm text-neutral-500 hover:underline">
              처음부터 다시 시작하기
            </button>
          </>
        )}
      </div>
    </main>
  );
}
