"use client";

import { ChessPiece } from "./ChessPiece";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

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
      board[square] = { square, type, color, symbol: type };
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
  hintSquares,
  canInteract,
  onSquareClick
}: {
  fen: string;
  orientation: "white" | "black";
  selectedSquare: string | null;
  lastMove?: { from: string; to: string } | null;
  hintSquares?: Set<string>;
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
        const isHint = hintSquares?.has(square) ?? false;
        const isCaptureHint = isHint && piece !== null;
        return (
          <button
            key={square}
            type="button"
            disabled={!canInteract}
            onClick={() => onSquareClick(square, piece)}
            className={`relative grid aspect-square place-items-center p-[6%] transition ${
              isLight ? "bg-[#eeeed2]" : "bg-[#769656]"
            } ${selected ? "ring-4 ring-inset ring-[#ff6b8a]" : ""} ${
              moved ? "after:absolute after:inset-0 after:bg-yellow-400/40" : ""
            } ${canInteract ? "cursor-pointer hover:brightness-110" : "cursor-default"}`}
            aria-label={square}
          >
            {piece && (
              <div className="relative z-10 h-full w-full">
                <ChessPiece type={piece.type} color={piece.color} />
              </div>
            )}
            {isHint && !isCaptureHint && (
              <span className="pointer-events-none absolute z-20 size-[32%] rounded-full bg-black/20" />
            )}
            {isCaptureHint && (
              <span className="pointer-events-none absolute inset-0 z-20 rounded-[2px] ring-[5px] ring-inset ring-black/25" />
            )}
          </button>
        );
      })}
    </div>
  );
}
