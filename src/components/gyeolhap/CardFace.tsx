import { COLOR_HEX, decodeCard } from "@/lib/gyeolhap";

export default function CardFace({ code }: { code: number }) {
  const { shape, bg, fg } = decodeCard(code);
  const fill = COLOR_HEX[fg];

  return (
    <div
      className="aspect-square w-full rounded-lg flex items-center justify-center"
      style={{ backgroundColor: COLOR_HEX[bg] }}
    >
      <svg viewBox="0 0 100 100" className="h-3/4 w-3/4">
        {shape === "circle" && (
          <circle cx="50" cy="50" r="35" fill={fill} stroke="rgba(0,0,0,0.35)" strokeWidth="4" />
        )}
        {shape === "triangle" && (
          <polygon
            points="50,15 85,80 15,80"
            fill={fill}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
        )}
        {shape === "square" && (
          <rect x="18" y="18" width="64" height="64" fill={fill} stroke="rgba(0,0,0,0.35)" strokeWidth="4" />
        )}
      </svg>
    </div>
  );
}
