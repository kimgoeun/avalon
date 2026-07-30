"use client";

import { useState } from "react";
import type { LiarPlayer, LiarRoom } from "@/lib/liar-game-actions";
import { advanceToResult } from "@/lib/liar-game-actions";

export default function Discussion({ room, me }: { room: LiarRoom; me: LiarPlayer }) {
  const [revealed, setRevealed] = useState(false);

  const isFakeWordMode = room.liar_mode === "fakeWord";
  const revealsLiarIdentity = !isFakeWordMode && me.is_liar;
  const wordToShow = isFakeWordMode && me.is_liar ? room.liar_word : room.word;

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-xl font-medium text-center px-4"
        >
          탭하여 내 제시어 확인하기
          <br />
          (다른 사람에게 보이지 않게 주의하세요)
        </button>
      ) : (
        <div className="w-full rounded-2xl p-6 space-y-4 text-white bg-gradient-to-b from-neutral-700 to-neutral-900">
          <div className="text-center space-y-1">
            {revealsLiarIdentity ? (
              <>
                <p className="text-sm uppercase tracking-widest opacity-80">당신은</p>
                <p className="text-4xl font-bold text-red-500">라이어</p>
              </>
            ) : !isFakeWordMode ? (
              <>
                <p className="text-sm uppercase tracking-widest opacity-80">당신은</p>
                <p className="text-4xl font-bold text-blue-400">시민</p>
              </>
            ) : (
              <p className="text-sm uppercase tracking-widest opacity-80">제시어</p>
            )}
          </div>

          {revealsLiarIdentity ? (
            room.show_category_to_liar ? (
              <div className="rounded-xl bg-black/20 p-4 text-center space-y-1">
                <p className="text-sm opacity-80">카테고리</p>
                <p className="text-2xl font-bold">{room.category}</p>
                <p className="text-sm opacity-70 mt-2">제시어는 알 수 없어요. 눈치껏 대화에 참여하세요!</p>
              </div>
            ) : (
              <div className="rounded-xl bg-black/20 p-4 text-center">
                <p className="text-base opacity-80">카테고리와 제시어를 모두 알 수 없어요.</p>
                <p className="text-sm opacity-70 mt-1">다른 사람들의 이야기를 듣고 눈치껏 대화에 참여하세요!</p>
              </div>
            )
          ) : (
            <div className="rounded-xl bg-black/20 p-4 text-center space-y-1">
              <p className="text-sm opacity-80">카테고리</p>
              <p className="text-lg font-medium">{room.category}</p>
              <p className="text-sm opacity-80 mt-3">제시어</p>
              <p className="text-3xl font-bold">{wordToShow}</p>
            </div>
          )}

          <button onClick={() => setRevealed(false)} className="w-full rounded-lg bg-white/10 py-3 text-base font-medium">
            숨기기
          </button>
        </div>
      )}

      <p className="text-center text-sm text-neutral-500">
        오프라인에서 자유롭게 토론하며 라이어를 찾아보세요. 토론이 끝나면 방장이 결과를 공개합니다.
      </p>

      {me.is_host ? (
        <button
          onClick={() => advanceToResult(room.id)}
          className="w-full rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium"
        >
          토론 종료 - 결과 공개
        </button>
      ) : (
        <p className="text-center text-base text-neutral-500">방장이 결과를 공개할 때까지 기다려주세요...</p>
      )}
    </div>
  );
}
