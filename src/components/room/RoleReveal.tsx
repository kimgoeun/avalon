"use client";

import { useState } from "react";
import type { Player, Room } from "@/lib/actions";
import { advanceToTeamBuilding } from "@/lib/actions";
import { computeVisibleInfo, isEvil, Role, ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/avalon";

export default function RoleReveal({
  room,
  players,
  me,
}: {
  room: Room;
  players: Player[];
  me: Player;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!me.role) {
    return <p className="text-center text-base text-neutral-500 p-6">역할을 배정하는 중...</p>;
  }

  const role = me.role as Role;
  const evil = isEvil(role);
  const visibleInfo = computeVisibleInfo(
    role,
    players.map((p) => ({ playerId: p.id, nickname: p.nickname, role: p.role as Role })),
    me.id
  );

  return (
    <div className="w-full max-w-md mx-auto space-y-6 p-6">
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-xl font-medium"
        >
          탭하여 내 역할 확인하기
          <br />
          (다른 사람에게 보이지 않게 주의하세요)
        </button>
      ) : (
        <div
          className={`w-full rounded-xl p-6 space-y-4 text-white ${
            evil ? "bg-gradient-to-b from-red-700 to-red-900" : "bg-gradient-to-b from-blue-700 to-blue-900"
          }`}
        >
          <div className="text-center space-y-1">
            <p className="text-sm uppercase tracking-widest opacity-80">{evil ? "악당 진영" : "선 진영"}</p>
            <p className="text-4xl font-bold">{ROLE_LABEL[role]}</p>
          </div>
          <p className="text-base opacity-90 text-center">{ROLE_DESCRIPTION[role]}</p>

          {visibleInfo.map((info) => (
            <div key={info.label} className="rounded-lg bg-black/20 p-3 space-y-1">
              <p className="text-sm opacity-80">{info.label}</p>
              {info.players.length === 0 ? (
                <p className="text-base italic opacity-70">정보 없음</p>
              ) : (
                <ul className="space-y-0.5">
                  {info.players.map((name) => (
                    <li key={name} className="text-base font-medium">
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <button
            onClick={() => setRevealed(false)}
            className="w-full rounded-md bg-white/10 py-3 text-base font-medium"
          >
            숨기기
          </button>
        </div>
      )}

      {me.is_host && (
        <button
          onClick={() => advanceToTeamBuilding(room.id)}
          className="w-full rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 py-3.5 font-medium"
        >
          모두 확인했어요, 게임 시작하기
        </button>
      )}
      {!me.is_host && (
        <p className="text-center text-base text-neutral-500">
          모두 역할을 확인하면 방장이 게임을 시작합니다
        </p>
      )}
    </div>
  );
}
