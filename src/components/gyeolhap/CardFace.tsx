import { COLOR_HEX, COLOR_TINT_HEX, decodeCard } from "@/lib/gyeolhap";

export default function CardFace({ code }: { code: number }) {
  const { shape, bg, fg } = decodeCard(code);
  const fill = COLOR_HEX[fg];

  return (
    <div
      className="aspect-square w-full rounded-2xl flex items-center justify-center border border-black/5"
      style={{ backgroundColor: COLOR_TINT_HEX[bg] }}
    >
      <svg viewBox="0 0 100 100" className="h-3/5 w-3/5 drop-shadow-sm">
        {shape === "circle" && <circle cx="50" cy="50" r="34" fill={fill} />}
        {shape === "triangle" && (
          <polygon points="50,14 87,82 13,82" fill={fill} strokeLinejoin="round" />
        )}
        {shape === "square" && <rect x="16" y="16" width="68" height="68" rx="14" fill={fill} />}
      </svg>
    </div>
  );
}
