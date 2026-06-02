"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { OAnQuanDirection, OAnQuanPit, OAnQuanSide } from "@/lib/games/o-an-quan/types";

const topRow = [11, 10, 9, 8, 7];
const bottomRow = [1, 2, 3, 4, 5];

function totalStones(pit: OAnQuanPit) {
  return pit.smallStones + pit.bigStones * 10;
}

export function StoneCountBadge({
  count,
  tone = "neutral"
}: {
  count: number;
  tone?: "neutral" | "quan";
}) {
  if (count <= 0) return null;
  return (
    <span
      className={`pointer-events-none absolute bottom-1 right-1 z-20 grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none shadow-sm ring-1 ${
        tone === "quan"
          ? "bg-amber-100 text-orange-700 ring-orange-200"
          : "bg-white/95 text-stone-700 ring-stone-200"
      }`}
    >
      {count}
    </span>
  );
}

function SmallStone({ className = "" }: { className?: string }) {
  return (
    <span className={`block size-2.5 rounded-full bg-gradient-to-br from-stone-50 via-amber-100 to-stone-300 shadow-[0_1px_1px_rgba(0,0,0,0.14)] ring-1 ring-stone-300/60 ${className}`} />
  );
}

function BigStone() {
  return (
    <span className="block size-5 rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-orange-600 shadow-sm ring-2 ring-orange-200" />
  );
}

export function StoneCluster({ count }: { count: number }) {
  if (count <= 0) return null;

  if (count >= 10) {
    return (
      <div className="relative grid size-10 place-items-center">
        <SmallStone className="absolute left-3 top-2" />
        <SmallStone className="absolute right-3 top-2.5" />
        <SmallStone className="absolute left-2.5 top-5" />
        <SmallStone className="absolute right-2.5 top-5" />
        <SmallStone className="absolute left-1/2 top-4 -translate-x-1/2" />
      </div>
    );
  }

  const visible = Math.min(count, 5);
  const positions = [
    "left-1/2 top-1 -translate-x-1/2",
    "left-3 top-3",
    "right-3 top-3",
    "left-[35%] bottom-2",
    "right-[35%] bottom-2"
  ];

  return (
    <div className="relative size-10">
      {Array.from({ length: visible }).map((_, index) => (
        <SmallStone key={index} className={`absolute ${positions[index]}`} />
      ))}
    </div>
  );
}

function MovePopup({
  text,
  nonce,
  quan = false
}: {
  text?: string | null;
  nonce?: number;
  quan?: boolean;
}) {
  if (!text) return null;
  return (
    <span
      key={nonce}
      className={`pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 animate-[oaq-pop_1100ms_ease-out_forwards] rounded-full bg-white px-2 py-0.5 text-[11px] font-black shadow-sm ${
        quan ? "text-orange-600" : "text-rose-600"
      }`}
    >
      {text}
    </span>
  );
}

export function OAnQuanPit({
  pit,
  selectable = false,
  selected = false,
  popup,
  popupNonce,
  onSelect
}: {
  pit: OAnQuanPit;
  selectable?: boolean;
  selected?: boolean;
  popup?: string | null;
  popupNonce?: number;
  onSelect?: () => void;
}) {
  const count = totalStones(pit);
  const isQuan = pit.type === "quan";
  const isEmpty = count === 0;

  if (isQuan) {
    return (
      <div className="relative grid h-full min-h-[7.5rem] min-w-0 place-items-center overflow-hidden rounded-[2rem] border-2 border-stone-300 bg-gradient-to-br from-amber-100 to-lime-100 p-2 shadow-inner">
        <MovePopup text={popup} nonce={popupNonce} quan />
        <span className="absolute top-3 text-[10px] font-black uppercase text-stone-500">Quan</span>
        <div className="grid place-items-center gap-2">
          {pit.bigStones > 0 && <BigStone />}
          {pit.smallStones > 0 && <StoneCluster count={pit.smallStones} />}
          {isEmpty && <span className="size-9 rounded-full bg-white/35" />}
        </div>
        <StoneCountBadge count={count} tone="quan" />
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onSelect}
      className={`relative grid aspect-square min-h-[3.6rem] w-full min-w-0 place-items-center overflow-hidden rounded-2xl border-2 shadow-sm transition ${
        selected
          ? "border-rose-400 bg-rose-100"
          : selectable
            ? "border-lime-400 bg-lime-100 hover:-translate-y-0.5"
            : isEmpty
              ? "border-amber-100 bg-white/35"
              : "border-amber-200 bg-amber-50"
      }`}
    >
      <MovePopup text={popup} nonce={popupNonce} />
      <StoneCluster count={pit.smallStones} />
      {pit.smallStones > 5 && <StoneCountBadge count={pit.smallStones} />}
    </button>
  );
}

export function OAnQuanBoard({
  board,
  mySide,
  canMove,
  selectedPit,
  popupPitIndex,
  popupNonce,
  pitPopupText = "+1",
  capturePopup,
  onSelectPit,
  onMove
}: {
  board: OAnQuanPit[];
  mySide: OAnQuanSide;
  canMove: boolean;
  selectedPit: number | null;
  popupPitIndex?: number | null;
  popupNonce?: number;
  pitPopupText?: string;
  capturePopup?: string | null;
  onSelectPit: (index: number) => void;
  onMove: (direction: OAnQuanDirection) => void;
}) {
  const flipped = mySide === "top";
  const myPits = new Set(flipped ? topRow : bottomRow);

  const displayTopRow = flipped ? [...bottomRow].reverse() : topRow;
  const displayBottomRow = flipped ? [...topRow].reverse() : bottomRow;
  const leftQuanIndex = flipped ? 6 : 0;
  const rightQuanIndex = flipped ? 0 : 6;

  function danPit(index: number) {
    const pit = board[index];
    const selectable = canMove && myPits.has(index) && pit.smallStones > 0;
    return (
      <OAnQuanPit
        key={index}
        pit={pit}
        selectable={selectable}
        selected={selectedPit === index}
        popup={popupPitIndex === index ? pitPopupText : null}
        popupNonce={popupNonce}
        onSelect={() => onSelectPit(index)}
      />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[clamp(1rem,3vw,2rem)] border border-amber-200 bg-gradient-to-br from-amber-100 via-lime-50 to-emerald-100 p-[clamp(8px,2vw,14px)] shadow-inner">
      <style>{`
        @keyframes oaq-pop {
          0% { opacity: 0; transform: translate(-50%, 8px) scale(0.86); }
          22% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -22px) scale(0.96); }
        }
      `}</style>
      {capturePopup && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-40 -translate-x-1/2 animate-[oaq-pop_1400ms_ease-out_forwards] rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-white shadow-lg">
          {capturePopup}
        </div>
      )}
      <div className="grid grid-cols-[clamp(4rem,18vw,6rem)_minmax(0,1fr)_clamp(4rem,18vw,6rem)] gap-[clamp(4px,1.5vw,10px)]">
        <OAnQuanPit pit={board[leftQuanIndex]} popup={popupPitIndex === leftQuanIndex ? pitPopupText : null} popupNonce={popupNonce} />
        <div className="grid min-w-0 gap-[clamp(4px,1.5vw,10px)]">
          <div className="grid min-w-0 grid-cols-5 gap-[clamp(3px,1vw,7px)]">{displayTopRow.map(danPit)}</div>
          <div className="grid min-w-0 grid-cols-5 gap-[clamp(3px,1vw,7px)]">{displayBottomRow.map(danPit)}</div>
        </div>
        <OAnQuanPit pit={board[rightQuanIndex]} popup={popupPitIndex === rightQuanIndex ? pitPopupText : null} popupNonce={popupNonce} />
      </div>
      <div className="mt-[clamp(8px,2vw,14px)] flex justify-center gap-3">
        <button
          type="button"
          aria-label="Move left"
          disabled={selectedPit === null || !canMove}
          className="grid size-[clamp(2.5rem,10vw,3rem)] place-items-center rounded-2xl bg-white text-slate-800 shadow-sm ring-1 ring-amber-200 transition disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onMove("counterclockwise")}
        >
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          aria-label="Move right"
          disabled={selectedPit === null || !canMove}
          className="grid size-[clamp(2.5rem,10vw,3rem)] place-items-center rounded-2xl bg-[#ff7a90] text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onMove("clockwise")}
        >
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
