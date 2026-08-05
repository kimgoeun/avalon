"use client";

import { breakdownIntoChips, CHIP_STEP, formatWon } from "@/lib/sevenpoker";

const CHIP_STYLES: Record<number, { bg: string; ring: string; text: string; label: string }> = {
  500: { bg: "#dc2626", ring: "#fecaca", text: "#fff", label: "500" },
  1000: { bg: "#fafaf9", ring: "#a8a29e", text: "#292524", label: "1K" },
  5000: { bg: "#18181b", ring: "#71717a", text: "#fff", label: "5K" },
  10000: { bg: "#15803d", ring: "#86efac", text: "#fff", label: "10K" },
};

const SIZES = {
  sm: { diameter: 22, offset: 5, font: 8, maxVisible: 4 },
  md: { diameter: 32, offset: 7, font: 10, maxVisible: 6 },
} as const;

function ChipIcon({ value, size }: { value: number; size: keyof typeof SIZES }) {
  const style = CHIP_STYLES[value] ?? CHIP_STYLES[500];
  const { diameter, font } = SIZES[size];
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold"
      style={{
        width: diameter,
        height: diameter,
        fontSize: font,
        background: style.bg,
        color: style.text,
        boxShadow: `inset 0 0 0 ${Math.max(2, diameter * 0.12)}px ${style.ring}, 0 1px 2px rgba(0,0,0,0.35)`,
      }}
    >
      {style.label}
    </div>
  );
}

/** A single denomination rendered as a stack (chips overlapping upward), capped with a ×N badge if tall. */
function DenominationStack({ value, count, size }: { value: number; count: number; size: keyof typeof SIZES }) {
  const { diameter, offset, maxVisible } = SIZES[size];
  const visible = Math.min(count, maxVisible);
  const height = diameter + (visible - 1) * offset;
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: diameter, height }}>
        {Array.from({ length: visible }).map((_, i) => (
          <div key={i} style={{ position: "absolute", bottom: i * offset, left: 0 }}>
            <ChipIcon value={value} size={size} />
          </div>
        ))}
      </div>
      {count > maxVisible && <span className="text-[10px] text-neutral-500 mt-0.5">×{count}</span>}
    </div>
  );
}

/** Renders an amount as stacked poker chips by denomination, largest value on the left. */
export function ChipStack({
  amount,
  size = "md",
  showTotal = true,
}: {
  amount: number;
  size?: keyof typeof SIZES;
  showTotal?: boolean;
}) {
  const entries = breakdownIntoChips(amount);
  if (entries.length === 0) {
    return showTotal ? <p className="text-sm text-neutral-400">칩 없음</p> : null;
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-end gap-1.5">
        {entries.map((e) => (
          <DenominationStack key={e.value} value={e.value} count={e.count} size={size} />
        ))}
      </div>
      {showTotal && <p className="text-sm font-bold">{formatWon(amount)}</p>}
    </div>
  );
}

/** Tap-to-add chip picker for choosing a bet/raise amount, clamped to [min, max] and CHIP_STEP multiples. */
export function ChipAmountPicker({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
}) {
  const denominations = [500, 1000, 5000, 10000];

  function add(v: number) {
    onChange(Math.min(max, value + v));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center min-h-[52px]">
        <ChipStack amount={value} size="md" />
      </div>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {denominations.map((v) => (
          <button
            key={v}
            type="button"
            disabled={value + v > max}
            onClick={() => add(v)}
            className="disabled:opacity-30"
            aria-label={`칩 ${formatWon(v)} 추가`}
          >
            <div className="relative" style={{ width: 32, height: 32 }}>
              <ChipIcon value={v} size="md" />
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - CHIP_STEP))}
          disabled={value <= min}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 text-sm disabled:opacity-30"
        >
          －
        </button>
        <button
          type="button"
          onClick={() => onChange(min)}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 text-sm"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={() => onChange(max)}
          className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-2.5 py-1.5 text-sm"
        >
          최대
        </button>
      </div>
    </div>
  );
}
