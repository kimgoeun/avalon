export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 7;
export const STARTING_CHIPS = 100000;
export const STREETS_PER_HAND = 4; // after 4th, 5th, 6th, 7th card
export const BET_UNIT_OPTIONS = [500, 1000] as const;
export type BetUnit = (typeof BET_UNIT_OPTIONS)[number];

export const CHIP_DENOMINATIONS = [
  { label: "🔴 빨강", value: 500, count: 20 },
  { label: "⚪ 흰색", value: 1000, count: 10 },
  { label: "⚫ 검정", value: 5000, count: 6 },
  { label: "🟢 초록", value: 10000, count: 5 },
] as const;

// Smallest chip denomination — every bet/raise amount must be a multiple of this.
export const CHIP_STEP = 500;

export function floorToChipStep(amount: number): number {
  return Math.floor(amount / CHIP_STEP) * CHIP_STEP;
}

export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export interface ChipBreakdownEntry {
  value: number;
  count: number;
}

/** Greedily breaks an amount into chip denominations (largest first) for display. */
export function breakdownIntoChips(amount: number): ChipBreakdownEntry[] {
  const denominations = [...CHIP_DENOMINATIONS].map((d) => d.value).sort((a, b) => b - a);
  let remaining = floorToChipStep(amount);
  const result: ChipBreakdownEntry[] = [];
  for (const value of denominations) {
    const count = Math.floor(remaining / value);
    if (count > 0) {
      result.push({ value, count });
      remaining -= count * value;
    }
  }
  return result;
}

// Rule 8: the most you may bet (when current_bet is 0) is half of the pot at that moment.
export function maxBetAmount(pot: number): number {
  return Math.max(0, floorToChipStep(pot / 2));
}

// Rule 8 (raise example): half of the pot *after* your call is added.
export function maxRaiseAmount(potAfterCall: number): number {
  return Math.max(0, floorToChipStep(potAfterCall / 2));
}

export interface StreetContribution {
  playerId: string;
  amount: number;
  folded: boolean;
}

export interface PotLayer {
  amount: number;
  eligiblePlayerIds: string[];
}

/**
 * Splits a street's total contributions into main-pot/side-pot layers. Money from a
 * folded player still counts toward pot amounts, it just never appears in any layer's
 * eligible-winner list. An all-in-for-less contribution creates a level boundary so the
 * excess above it becomes a side pot the all-in player can't win (rule 15).
 */
export function computePotLayers(contributions: StreetContribution[]): PotLayer[] {
  const withMoney = contributions.filter((c) => c.amount > 0);
  if (withMoney.length === 0) return [];

  const levels = Array.from(new Set(withMoney.map((c) => c.amount))).sort((a, b) => a - b);

  const layers: PotLayer[] = [];
  let prevLevel = 0;
  for (const level of levels) {
    const layerAmount = withMoney.reduce(
      (sum, c) => sum + (Math.min(c.amount, level) - Math.min(c.amount, prevLevel)),
      0
    );
    if (layerAmount > 0) {
      const eligiblePlayerIds = withMoney.filter((c) => !c.folded && c.amount >= level).map((c) => c.playerId);
      layers.push({ amount: layerAmount, eligiblePlayerIds });
    }
    prevLevel = level;
  }
  return layers;
}

/**
 * Builds the turn-order queue for a street: starting from firstActorId, going around
 * the seating order once, skipping anyone excluded (folded / all-in / busted).
 */
export function buildActorQueue(seatOrderIds: string[], firstActorId: string, excludeIds: Set<string>): string[] {
  const startIndex = seatOrderIds.indexOf(firstActorId);
  if (startIndex === -1) return [];
  const queue: string[] = [];
  for (let i = 0; i < seatOrderIds.length; i++) {
    const id = seatOrderIds[(startIndex + i) % seatOrderIds.length];
    if (!excludeIds.has(id)) queue.push(id);
  }
  return queue;
}

/**
 * Splits an amount evenly among winners in chip-step increments, handing out any extra
 * steps round-robin (rather than dumping the whole remainder on one winner) and only
 * the final leftover smaller than one chip step to the first winner.
 */
export function splitPot(amount: number, winnerIds: string[]): Record<string, number> {
  if (winnerIds.length === 0) return {};
  const totalSteps = Math.floor(amount / CHIP_STEP);
  const subChipRemainder = amount - totalSteps * CHIP_STEP;
  const baseSteps = Math.floor(totalSteps / winnerIds.length);
  let extraSteps = totalSteps - baseSteps * winnerIds.length;

  const result: Record<string, number> = {};
  for (const id of winnerIds) {
    let steps = baseSteps;
    if (extraSteps > 0) {
      steps += 1;
      extraSteps -= 1;
    }
    result[id] = steps * CHIP_STEP;
  }
  result[winnerIds[0]] += subChipRemainder;
  return result;
}
