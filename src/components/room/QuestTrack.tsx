import type { Quest, Room } from "@/lib/actions";
import { QUEST_CONFIGS } from "@/lib/avalon";

export default function QuestTrack({ room, quests, playerCount }: { room: Room; quests: Quest[]; playerCount: number }) {
  const config = QUEST_CONFIGS[playerCount];
  if (!config) return null;

  const resultByRound = new Map<number, "success" | "fail">();
  for (const q of quests) {
    if (q.result) resultByRound.set(q.round, q.result as "success" | "fail");
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {config.teamSizes.map((size, i) => {
          const round = i + 1;
          const result = resultByRound.get(round);
          const isCurrent = room.round === round && !result && room.phase !== "game_over";
          return (
            <div key={round} className="flex flex-col items-center gap-1">
              <div
                className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                  result === "success"
                    ? "bg-blue-500 border-blue-500 text-white"
                    : result === "fail"
                      ? "bg-red-500 border-red-500 text-white"
                      : isCurrent
                        ? "border-amber-400 ring-2 ring-amber-300"
                        : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {result === "success" ? "O" : result === "fail" ? "X" : size}
              </div>
              {config.failsRequired[i] === 2 && (
                <span className="text-[10px] text-neutral-500">2실패</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-neutral-500 mr-1">부결</span>
        {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
          <div
            key={n}
            className={`h-3 w-3 rounded-full border-2 ${
              n <= room.reject_count ? "bg-red-500 border-red-500" : "border-neutral-300 dark:border-neutral-700"
            }`}
          />
        ))}
        <span className="text-[10px] text-neutral-500 ml-1">{room.reject_count}/5</span>
      </div>
    </div>
  );
}
