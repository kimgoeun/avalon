"use client";

import { useEffect, useRef, useState } from "react";
import type { Room } from "@/lib/actions";
import { DISCUSSION_TIMER_SECONDS, clearTimer, pauseTimer, resumeTimer, startTimer } from "@/lib/actions";

function playAlarm() {
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  const now = ctx.currentTime;
  [0, 0.35, 0.7].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.35, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.3);
    osc.start(now + delay);
    osc.stop(now + delay + 0.32);
  });
  setTimeout(() => ctx.close(), 1200);
}

function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default function DiscussionTimer({ room, isHost }: { room: Room; isHost: boolean }) {
  const timerEndsAt = room.timer_ends_at;
  const timerRemainingSec = room.timer_remaining_sec;

  const [runningRemainingSec, setRunningRemainingSec] = useState<number>(() =>
    timerEndsAt ? Math.max(0, Math.ceil((new Date(timerEndsAt).getTime() - Date.now()) / 1000)) : 0
  );

  useEffect(() => {
    if (!timerEndsAt) return;
    const endsAt = new Date(timerEndsAt).getTime();
    function tick() {
      setRunningRemainingSec(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [timerEndsAt]);

  const isRunning = timerEndsAt !== null;
  const isPaused = !isRunning && timerRemainingSec != null;
  const isIdle = !isRunning && !isPaused;
  const remainingSec = isRunning ? runningRemainingSec : isPaused ? timerRemainingSec! : DISCUSSION_TIMER_SECONDS;
  const isDone = isRunning && runningRemainingSec === 0;

  const alarmedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (isDone && timerEndsAt && alarmedForRef.current !== timerEndsAt) {
      alarmedForRef.current = timerEndsAt;
      playAlarm();
    }
    if (!isDone) {
      alarmedForRef.current = null;
    }
  }, [isDone, timerEndsAt]);

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
        isDone
          ? "border-red-600 bg-red-600 text-white animate-pulse"
          : "border-neutral-200 dark:border-neutral-800"
      }`}
    >
      <span className={`text-xs ${isDone ? "text-white" : "text-neutral-500"}`}>
        {isDone ? "토론 시간 종료" : "토론 타이머"}
      </span>
      <span className={`text-3xl font-mono font-bold tabular-nums ${isDone ? "text-white" : ""}`}>
        {formatTime(remainingSec)}
      </span>

      {isHost && (
        <div className="flex items-center gap-2">
          {isIdle && (
            <button
              className="text-xs px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700"
              onClick={() => startTimer(room.id)}
            >
              시작
            </button>
          )}
          {isRunning && !isDone && (
            <button
              className="text-xs px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700"
              onClick={() => pauseTimer(room)}
            >
              일시정지
            </button>
          )}
          {isPaused && (
            <button
              className="text-xs px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700"
              onClick={() => resumeTimer(room)}
            >
              재개
            </button>
          )}
          {(isPaused || isDone) && (
            <button
              className={`text-xs px-3 py-1.5 rounded border ${
                isDone ? "border-white text-white" : "border-neutral-300 dark:border-neutral-700"
              }`}
              onClick={() => clearTimer(room.id)}
            >
              초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
}
