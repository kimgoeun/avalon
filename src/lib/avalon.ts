export type GoodRole = "merlin" | "percival" | "loyal_servant";
export type EvilRole = "morgana" | "mordred" | "oberon" | "assassin" | "minion";
export type Role = GoodRole | EvilRole;

export const GOOD_ROLES: GoodRole[] = ["merlin", "percival", "loyal_servant"];
export const EVIL_ROLES: EvilRole[] = ["morgana", "mordred", "oberon", "assassin", "minion"];

export function isEvil(role: Role): boolean {
  return (EVIL_ROLES as Role[]).includes(role);
}

export const ROLE_LABEL: Record<Role, string> = {
  merlin: "멀린",
  percival: "퍼시벌",
  loyal_servant: "충성스러운 시종",
  morgana: "모르가나",
  mordred: "모드레드",
  oberon: "오베론",
  assassin: "암살자",
  minion: "모드레드의 하수인",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  merlin: "누가 악당인지 알고 있습니다 (오베론과 모드레드는 보이지 않습니다). 정체를 들키면 안 됩니다.",
  percival: "멀린과 모르가나를 보지만, 누가 진짜 멀린인지는 구분할 수 없습니다.",
  loyal_servant: "선을 위해 싸우는 평범한 시종입니다. 특별한 정보는 없습니다.",
  morgana: "퍼시벌에게 멀린으로 오인되도록 자신을 드러냅니다. 다른 악당들을 알고 있습니다.",
  mordred: "멀린에게 정체가 보이지 않는 악당입니다. 다른 악당들을 알고 있습니다.",
  oberon: "다른 악당들도, 멀린도 서로를 알아볼 수 없는 고립된 악당입니다.",
  assassin: "게임 막판 선이 승리하면 멀린을 지목해 암살할 기회를 갖습니다. 다른 악당들을 알고 있습니다.",
  minion: "모드레드를 따르는 악당입니다. 다른 악당들을 알고 있습니다 (오베론 제외).",
};

export interface QuestConfig {
  teamSizes: number[]; // length 5, index 0 = round 1
  failsRequired: number[]; // length 5, usually 1, sometimes 2
  evilCount: number;
}

export const QUEST_CONFIGS: Record<number, QuestConfig> = {
  5: { teamSizes: [2, 3, 2, 3, 3], failsRequired: [1, 1, 1, 1, 1], evilCount: 2 },
  6: { teamSizes: [2, 3, 4, 3, 4], failsRequired: [1, 1, 1, 1, 1], evilCount: 2 },
  7: { teamSizes: [2, 3, 3, 4, 4], failsRequired: [1, 1, 1, 2, 1], evilCount: 3 },
  8: { teamSizes: [3, 4, 4, 5, 5], failsRequired: [1, 1, 1, 2, 1], evilCount: 3 },
  9: { teamSizes: [3, 4, 4, 5, 5], failsRequired: [1, 1, 1, 2, 1], evilCount: 3 },
  10: { teamSizes: [3, 4, 4, 5, 5], failsRequired: [1, 1, 1, 2, 1], evilCount: 4 },
};

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 10;

export interface RoleOptions {
  percival: boolean;
  morgana: boolean;
  mordred: boolean;
  oberon: boolean;
}

export const DEFAULT_ROLE_OPTIONS: RoleOptions = {
  percival: true,
  morgana: true,
  mordred: false,
  oberon: false,
};

// Max number of optional evil roles (morgana/mordred/oberon) usable given evilCount.
// assassin is always the "named" evil so evilCount - 1 slots remain for morgana/mordred/oberon,
// the rest are filled with generic "minion" evil roles.
export function maxOptionalEvilRoles(playerCount: number): number {
  const evilCount = QUEST_CONFIGS[playerCount].evilCount;
  return Math.max(0, evilCount - 1);
}

export function buildRolePool(playerCount: number, options: RoleOptions): Role[] {
  const { evilCount } = QUEST_CONFIGS[playerCount];
  const goodCount = playerCount - evilCount;

  const evilRoles: EvilRole[] = ["assassin"];
  if (options.morgana) evilRoles.push("morgana");
  if (options.mordred) evilRoles.push("mordred");
  if (options.oberon) evilRoles.push("oberon");
  while (evilRoles.length < evilCount) evilRoles.push("minion");
  if (evilRoles.length > evilCount) {
    throw new Error("선택한 악당 특수 역할 수가 전체 악당 수보다 많습니다.");
  }

  const goodRoles: GoodRole[] = ["merlin"];
  if (options.percival) goodRoles.push("percival");
  while (goodRoles.length < goodCount) goodRoles.push("loyal_servant");
  if (goodRoles.length > goodCount) {
    throw new Error("선택한 선 특수 역할 수가 전체 선 인원수보다 많습니다.");
  }

  return [...goodRoles, ...evilRoles];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function assignRoles(playerIds: string[], options: RoleOptions): Record<string, Role> {
  const pool = shuffle(buildRolePool(playerIds.length, options));
  const assignment: Record<string, Role> = {};
  playerIds.forEach((id, i) => {
    assignment[id] = pool[i];
  });
  return assignment;
}

export interface VisibleInfo {
  label: string;
  players: string[]; // nicknames
}

/**
 * Given the viewer's role and the full role map (playerId -> role, nickname map),
 * compute what this viewer is allowed to see about others.
 */
export function computeVisibleInfo(
  viewerRole: Role,
  roleByPlayer: { playerId: string; nickname: string; role: Role }[],
  viewerPlayerId: string
): VisibleInfo[] {
  const others = roleByPlayer.filter((p) => p.playerId !== viewerPlayerId);

  if (viewerRole === "merlin") {
    // Merlin sees all evil except Oberon and Mordred.
    const seen = others.filter((p) => isEvil(p.role) && p.role !== "oberon" && p.role !== "mordred");
    return [{ label: "악당들 (오베론·모드레드 제외)", players: seen.map((p) => p.nickname) }];
  }

  if (viewerRole === "percival") {
    // Percival sees Merlin and Morgana, indistinguishable.
    const seen = others.filter((p) => p.role === "merlin" || p.role === "morgana");
    return [{ label: "멀린 또는 모르가나 (누가 누구인지는 모름)", players: shuffle(seen.map((p) => p.nickname)) }];
  }

  if (isEvil(viewerRole) && viewerRole !== "oberon") {
    // Evil (except Oberon) see each other, except Oberon is hidden from them too.
    const seen = others.filter((p) => isEvil(p.role) && p.role !== "oberon");
    return [{ label: "다른 악당들", players: seen.map((p) => p.nickname) }];
  }

  // loyal_servant, oberon: no information.
  return [];
}
