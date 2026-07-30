"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ALL_CARD_CODES, hasAnyCombo, isValidCombo, refillBoard, shuffle } from "@/lib/gyeolhap";
import CardFace from "@/components/gyeolhap/CardFace";

function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default function GyeolhapSoloPage() {
  const [board, setBoard] = useState<number[]>([]);
  const [deck, setDeck] = useState<number[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [found, setFound] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<"none" | "success" | "fail">("none");

  function startNewGame() {
    const shuffled = shuffle(ALL_CARD_CODES);
    const { addedCodes, remainingDeck } = refillBoard([], shuffled);
    setBoard(addedCodes);
    setDeck(remainingDeck);
    setSelected([]);
    setFound(0);
    setMistakes(0);
    setStartedAt(Date.now());
    setElapsedSec(0);
    setGameOver(false);
    setFeedback("none");
  }

  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start exactly once on mount
  }, []);

  useEffect(() => {
    if (!startedAt || gameOver) return;
    const interval = setInterval(() => setElapsedSec(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => clearInterval(interval);
  }, [startedAt, gameOver]);

  function toggleCard(code: number) {
    if (gameOver) return;
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
      const finalBoard = [...remainingBoard, ...addedCodes];
      setBoard(finalBoard);
      setDeck(remainingDeck);
      setFound((f) => f + 1);
      setFeedback("success");
      if (remainingDeck.length === 0 && !hasAnyCombo(finalBoard)) {
        setGameOver(true);
      }
    } else {
      setMistakes((m) => m + 1);
      setFeedback("fail");
    }

    setSelected([]);
    setTimeout(() => setFeedback("none"), 500);
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Link href="/gyeolhap" className="fixed top-4 left-4 text-sm text-neutral-500 hover:underline">
        ← 결합
      </Link>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">혼자하기</h1>
          <p className="text-base text-neutral-500">시간과 실수를 기록하며 결합을 찾아보세요</p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
          <div className="text-center flex-1">
            <p className="text-sm text-neutral-500">시간</p>
            <p className="text-2xl font-mono font-bold tabular-nums">{formatTime(elapsedSec)}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-sm text-neutral-500">찾은 결합</p>
            <p className="text-2xl font-bold">{found}</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-sm text-neutral-500">실수</p>
            <p className="text-2xl font-bold">{mistakes}</p>
          </div>
        </div>

        {gameOver ? (
          <div className="text-center space-y-4 rounded-2xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-6">
            <p className="text-3xl font-extrabold text-blue-600">클리어!</p>
            <p className="text-base text-neutral-600 dark:text-neutral-300">
              {formatTime(elapsedSec)} 만에 결합 {found}개를 모두 찾았어요 (실수 {mistakes}번)
            </p>
            <button
              onClick={startNewGame}
              className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium"
            >
              다시 하기
            </button>
          </div>
        ) : (
          <>
            {feedback !== "none" && (
              <p className={`text-center text-lg font-medium ${feedback === "success" ? "text-blue-600" : "text-red-500"}`}>
                {feedback === "success" ? "결합 성공!" : "결합이 아니에요"}
              </p>
            )}

            <div className="grid grid-cols-3 gap-3">
              {board.map((code) => {
                const isSelected = selected.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleCard(code)}
                    className={`rounded-xl border-4 p-1 transition cursor-pointer ${
                      isSelected ? "border-amber-400" : "border-transparent"
                    }`}
                  >
                    <CardFace code={code} />
                  </button>
                );
              })}
            </div>

            <button
              disabled={selected.length !== 3}
              onClick={submit}
              className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium disabled:opacity-50"
            >
              결합 확인 ({selected.length}/3)
            </button>

            <button onClick={startNewGame} className="w-full text-center text-sm text-neutral-500 hover:underline">
              다시 시작하기
            </button>
          </>
        )}
      </div>
    </main>
  );
}
