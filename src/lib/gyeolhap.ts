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
export const TURN_SECONDS = 30;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;

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

export function hasAnyCombo(codes: number[]): boolean {
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      for (let k = j + 1; k < codes.length; k++) {
        if (isValidCombo([codes[i], codes[j], codes[k]])) return true;
      }
    }
  }
  return false;
}

/**
 * Tops the board up to BOARD_SIZE, then — since a "결합"-free board is possible even
 * at 9 cards (the max cap-set size for this 3-attribute deck is exactly 9) — keeps
 * dealing 3 more at a time from the deck until a combo exists or the deck runs out.
 */
export function refillBoard(
  currentCodes: number[],
  deck: number[]
): { addedCodes: number[]; remainingDeck: number[] } {
  const codes = [...currentCodes];
  const remaining = [...deck];
  const added: number[] = [];

  while (codes.length < BOARD_SIZE && remaining.length > 0) {
    const c = remaining.shift()!;
    codes.push(c);
    added.push(c);
  }

  while (!hasAnyCombo(codes) && remaining.length > 0) {
    const take = Math.min(3, remaining.length);
    for (let i = 0; i < take; i++) {
      const c = remaining.shift()!;
      codes.push(c);
      added.push(c);
    }
  }

  return { addedCodes: added, remainingDeck: remaining };
}
