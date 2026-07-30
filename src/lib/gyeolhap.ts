export const SHAPES = ["circle", "triangle", "square"] as const;
export type Shape = (typeof SHAPES)[number];

export const COLORS = ["green", "indigo", "magenta"] as const;
export type ColorName = (typeof COLORS)[number];

// Bold fill for the shape itself.
export const COLOR_HEX: Record<ColorName, string> = {
  green: "#16A34A",
  indigo: "#4F46E5",
  magenta: "#DB2777",
};

// Soft tint for the card face background — always distinct from COLOR_HEX so a
// shape stays legible even when its own color matches the card's background attribute.
export const COLOR_TINT_HEX: Record<ColorName, string> = {
  green: "#DCFCE7",
  indigo: "#E0E7FF",
  magenta: "#FCE7F3",
};

export const SHAPE_LABEL: Record<Shape, string> = {
  circle: "동그라미",
  triangle: "세모",
  square: "네모",
};

export const COLOR_LABEL: Record<ColorName, string> = {
  green: "초록",
  indigo: "보라",
  magenta: "핑크",
};

export const BOARD_SIZE = 9;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;

// 시즌2 데스매치 rules: 10 rounds, a single 10s turn timer to declare 합!/결!/pass and
// (if 합! was declared) name 3 cards, and a round ends early after 6 consecutive passes.
export const MAX_ROUNDS = 10;
export const DECISION_SECONDS = 10;
export const PASS_STREAK_LIMIT = 6;

export interface CardInfo {
  code: number;
  shape: Shape;
  bg: ColorName;
  fg: ColorName;
}

export const ALL_CARD_CODES: number[] = Array.from({ length: 27 }, (_, i) => i);

export function decodeCard(code: number): CardInfo {
  return {
    code,
    shape: SHAPES[code % 3],
    bg: COLORS[Math.floor(code / 3) % 3],
    fg: COLORS[Math.floor(code / 9) % 3],
  };
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// The classic ternary-SET trick: an attribute is valid (all same or all different)
// across three cards exactly when its three values sum to 0 mod 3.
function attributeOk(values: number[]): boolean {
  return (values[0] + values[1] + values[2]) % 3 === 0;
}

export function isValidCombo(codes: number[]): boolean {
  if (codes.length !== 3) return false;
  const shapeVals = codes.map((c) => c % 3);
  const bgVals = codes.map((c) => Math.floor(c / 3) % 3);
  const fgVals = codes.map((c) => Math.floor(c / 9) % 3);
  return attributeOk(shapeVals) && attributeOk(bgVals) && attributeOk(fgVals);
}

// A combo's identity for tracking "already found" — order-independent, so the three
// card codes are sorted before joining into a key.
export function comboKey(codes: number[]): string {
  return [...codes].sort((a, b) => a - b).join("-");
}

// Every valid combo among the given (fixed, unchanging) board codes, as normalized keys.
export function findAllCombos(codes: number[]): string[] {
  const keys: string[] = [];
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      for (let k = j + 1; k < codes.length; k++) {
        const triple = [codes[i], codes[j], codes[k]];
        if (isValidCombo(triple)) keys.push(comboKey(triple));
      }
    }
  }
  return keys;
}

export function dealBoard(): number[] {
  return shuffle(ALL_CARD_CODES).slice(0, BOARD_SIZE);
}
