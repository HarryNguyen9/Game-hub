"use client";

type PieceColor = "w" | "b";

interface PieceProps {
  color: PieceColor;
}

function svg(color: PieceColor, paths: React.ReactNode) {
  const fill = color === "w" ? "#ffffff" : "#1e1e1e";
  const stroke = color === "w" ? "#000000" : "#666666";
  return (
    <svg
      viewBox="0 0 45 45"
      className="h-full w-full"
      style={{
        filter:
          color === "w"
            ? "drop-shadow(0 1px 3px rgba(0,0,0,0.8))"
            : "drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
      }}
      aria-hidden
    >
      <g
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths}
      </g>
    </svg>
  );
}

function Pawn({ color }: PieceProps) {
  return svg(
    color,
    <>
      <circle cx="22.5" cy="10" r="5" />
      <path d="M 20,14.5 C 17,16.5 16,20.5 16.5,23.5 C 17,26 18.5,27.5 20.5,28 C 17,29 14.5,32 14.5,36 L 30.5,36 C 30.5,32 28,29 24.5,28 C 26.5,27.5 28,26 28.5,23.5 C 29,20.5 28,16.5 25,14.5 Z" />
      <path d="M 12,37 L 33,37 L 33,40 L 12,40 Z" />
    </>
  );
}

function Rook({ color }: PieceProps) {
  return svg(
    color,
    <>
      <path d="M 9,39 L 36,39 L 36,36 L 9,36 Z" />
      <path d="M 12,36 L 12,31 L 33,31 L 33,36 Z" />
      <path d="M 12,31 L 12,14 L 15,14 L 15,17 L 19,17 L 19,14 L 26,14 L 26,17 L 30,17 L 30,14 L 33,14 L 33,31 Z" />
    </>
  );
}

function Knight({ color }: PieceProps) {
  return svg(
    color,
    <>
      <path d="M 22,10 C 19,10 16.5,11.5 16,14 C 15.5,16 16.5,18 17,19 L 14,25 L 13,32 L 32,32 L 31,25 L 28,19 C 28.5,18 29.5,16 29,14 C 28.5,11.5 26,10 22,10 Z" />
      <path d="M 9,39 L 36,39 L 36,36 L 9,36 Z" />
      <path d="M 13,32 L 13,36 L 32,36 L 32,32 Z" />
      <circle cx="18.5" cy="16" r="1.5" fill={color === "w" ? "#000" : "#aaa"} stroke="none" />
      <path
        d="M 17,19 C 18,17.5 20.5,17 22,18 C 20,19 19.5,21 20,22 C 18.5,21 17.5,20 17,19 Z"
        fill={color === "w" ? "#000" : "#aaa"}
        stroke="none"
      />
    </>
  );
}

function Bishop({ color }: PieceProps) {
  return svg(
    color,
    <>
      <circle cx="22.5" cy="6" r="2.5" />
      <path d="M 22.5,8.5 C 22.5,8.5 16.5,13 16.5,19.5 C 16.5,23 18,25.5 20,26.5 C 16.5,28 14,31 14,35 L 31,35 C 31,31 28.5,28 25,26.5 C 27,25.5 28.5,23 28.5,19.5 C 28.5,13 22.5,8.5 22.5,8.5 Z" />
      <line x1="20" y1="12" x2="25" y2="12" />
      <path d="M 12,37 L 33,37 L 33,40 L 12,40 Z" />
      <line x1="14" y1="35" x2="31" y2="35" />
      <path d="M 12,37 L 12,35 L 33,35 L 33,37 Z" />
    </>
  );
}

function Queen({ color }: PieceProps) {
  return svg(
    color,
    <>
      <circle cx="6" cy="12" r="2.75" />
      <circle cx="14" cy="9" r="2.75" />
      <circle cx="22.5" cy="8" r="2.75" />
      <circle cx="31" cy="9" r="2.75" />
      <circle cx="39" cy="12" r="2.75" />
      <path d="M 9,26 C 9,26 6.5,14.5 6,12 L 14,20 L 17.5,10.5 L 22.5,22.5 L 27.5,10.5 L 31,20 L 39,12 C 38.5,14.5 36,26 36,26 Z" />
      <path d="M 9,26 C 9,28 9.5,30 14.5,32 L 30.5,32 C 35.5,30 36,28 36,26 Z" />
      <path d="M 11.5,36 L 33.5,36 L 33.5,38.5 L 11.5,38.5 Z" />
      <path d="M 14.5,32 L 14.5,36 L 30.5,36 L 30.5,32 Z" />
    </>
  );
}

function King({ color }: PieceProps) {
  return svg(
    color,
    <>
      <line x1="22.5" y1="4" x2="22.5" y2="11.5" strokeWidth="2" />
      <line x1="18.5" y1="7.5" x2="26.5" y2="7.5" strokeWidth="2" />
      <path d="M 22.5,11.5 C 22.5,11.5 16.5,14 16,19.5 C 15.5,24 17,26.5 19,27.5 C 15.5,29 13,32 13,36 L 32,36 C 32,32 29.5,29 26,27.5 C 28,26.5 29.5,24 29,19.5 C 28.5,14 22.5,11.5 22.5,11.5 Z" />
      <path d="M 11.5,38 L 33.5,38 L 33.5,40.5 L 11.5,40.5 Z" />
      <line x1="13" y1="36" x2="32" y2="36" />
      <path d="M 11.5,38 L 11.5,36 L 33.5,36 L 33.5,38 Z" />
    </>
  );
}

const PIECE_MAP: Record<string, (p: PieceProps) => React.ReactElement | null> = {
  p: Pawn,
  r: Rook,
  n: Knight,
  b: Bishop,
  q: Queen,
  k: King
};

export function ChessPiece({ type, color }: { type: string; color: PieceColor }) {
  const Piece = PIECE_MAP[type];
  if (!Piece) return null;
  return <Piece color={color} />;
}
