"use client";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const WHITE_SYMBOLS: Record<string, string> = { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" };
const BLACK_SYMBOLS: Record<string, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };

export type BoardPiece = {
  square: string;
  type: string;
  color: "w" | "b";
  symbol: string;
};

export function boardFromFen(fen: string) {
  const board: Record<string, BoardPiece> = {};
  const placement = fen.split(" ")[0] || "";
  const ranks = placement.split("/");
  for (let rankIndex = 0; rankIndex < 8; rankIndex += 1) {
    let fileIndex = 0;
    const rank = 8 - rankIndex;
    for (const char of ranks[rankIndex] || "") {
      const empty = Number(char);
      if (Number.isFinite(empty) && empty > 0) {
        fileIndex += empty;
        continue;
      }
      const color = char === char.toUpperCase() ? "w" : "b";
      const type = char.toLowerCase();
      const square = `${FILES[fileIndex]}${rank}`;
      board[square] = {
        square,
        type,
        color,
        symbol: color === "w" ? WHITE_SYMBOLS[type] : BLACK_SYMBOLS[type]
      };
      fileIndex += 1;
    }
  }
  return board;
}

function orientedSquares(orientation: "white" | "black") {
  const files = orientation === "white" ? FILES : [...FILES].reverse();
  const ranks = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  return ranks.flatMap((rank) => files.map((file) => `${file}${rank}`));
}

export function ChessBoard({
  fen,
  orientation,
  selectedSquare,
  lastMove,
  canInteract,
  onSquareClick
}: {
  fen: string;
  orientation: "white" | "black";
  selectedSquare: string | null;
  lastMove?: { from: string; to: string } | null;
  canInteract: boolean;
  onSquareClick: (square: string, piece: BoardPiece | null) => void;
}) {
  const board = boardFromFen(fen);
  const squares = orientedSquares(orientation);

  return (
    <div className="mx-auto grid aspect-square w-full max-w-[min(92vw,38rem)] grid-cols-8 overflow-hidden rounded-[1rem] border-[6px] border-[#2d2d2d] bg-[#2d2d2d] shadow-2xl">
      {squares.map((square) => {
        const fileIndex = FILES.indexOf(square[0]);
        const rank = Number(square[1]);
        const isLight = (fileIndex + rank) % 2 === 1;
        const piece = board[square] || null;
        const selected = selectedSquare === square;
        const moved = lastMove?.from === square || lastMove?.to === square;
        return (
          <button
            key={square}
            type="button"
            disabled={!canInteract}
            onClick={() => onSquareClick(square, piece)}
            className={`relative grid aspect-square place-items-center text-[clamp(2.1rem,8.5vw,4.5rem)] font-black leading-none transition ${
              isLight ? "bg-[#eeeed2]" : "bg-[#769656]"
            } ${selected ? "ring-4 ring-inset ring-[#ff6b8a]" : ""} ${moved ? "after:absolute after:inset-0 after:bg-yellow-400/40" : ""} ${
              canInteract ? "cursor-pointer hover:brightness-110" : "cursor-default"
            }`}
            aria-label={square}
          >
            <span className={`relative z-10 ${piece?.color === "w" ? "text-white [text-shadow:_0_1px_3px_rgba(0,0,0,0.8),_0_0_1px_rgba(0,0,0,1)]" : "text-[#1a1a1a] [text-shadow:_0_1px_2px_rgba(255,255,255,0.3)]"}`}>
              {piece?.symbol}
            </span>
          </button>
        );
      })}
    </div>
  );
}
