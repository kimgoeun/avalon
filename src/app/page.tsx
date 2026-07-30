import Link from "next/link";

interface GameEntry {
  slug: string;
  name: string;
  description: string;
  available: boolean;
}

const GAMES: GameEntry[] = [
  {
    slug: "avalon",
    name: "아발론",
    description: "역할 배정부터 찬반투표, 퀘스트 진행까지 한 번에",
    available: true,
  },
  {
    slug: "sudoku",
    name: "스도쿠",
    description: "준비 중",
    available: false,
  },
  {
    slug: "liar-game",
    name: "라이어 게임",
    description: "준비 중",
    available: false,
  },
];

export default function GameHubPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">트웬티 게임타운</h1>
          <p className="text-base text-neutral-500">같이 할 게임을 골라주세요</p>
        </div>

        <ul className="space-y-3">
          {GAMES.map((game) =>
            game.available ? (
              <li key={game.slug}>
                <Link
                  href={`/${game.slug}`}
                  className="flex items-center justify-between rounded-xl border border-neutral-300 dark:border-neutral-700 px-5 py-4 transition hover:border-neutral-500 dark:hover:border-neutral-400"
                >
                  <span>
                    <span className="block text-lg font-medium">{game.name}</span>
                    <span className="block text-sm text-neutral-500">{game.description}</span>
                  </span>
                  <span className="text-neutral-400">→</span>
                </Link>
              </li>
            ) : (
              <li key={game.slug}>
                <div className="flex items-center justify-between rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 px-5 py-4 opacity-50">
                  <span>
                    <span className="block text-lg font-medium">{game.name}</span>
                    <span className="block text-sm text-neutral-500">{game.description}</span>
                  </span>
                </div>
              </li>
            )
          )}
        </ul>
      </div>
    </main>
  );
}
