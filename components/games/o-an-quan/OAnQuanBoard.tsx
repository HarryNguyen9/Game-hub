"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { OAnQuanDirection, OAnQuanPit, OAnQuanSide } from "@/lib/games/o-an-quan/types";

const topRow = [11, 10, 9, 8, 7];
const bottomRow = [1, 2, 3, 4, 5];

function Pebbles({ count, type, max }: { count: number; type: "small" | "big"; max: number }) {
  const visible = Math.min(count, max);
  if (count <= 0) return null;
  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-[2px]">
      {Array.from({ length: visible }).map((_, index) => (
        <span
          key={`${type}-${index}`}
          className={
            type === "big"
              ? "rounded-full bg-gradient-to-br from-amber-300 to-orange-500 shadow-sm ring-1 ring-amber-600/20 [--s:clamp(0.6rem,3.5cqw,1rem)] size-[--s]"
              : "rounded-full bg-gradient-to-br from-stone-50 via-amber-100 to-stone-300 shadow-[0_1px_0_rgba(0,0,0,0.12)] ring-1 ring-stone-300/50 [--s:clamp(0.4rem,2.2cqw,0.625rem)] size-[--s]"
          }
        />
      ))}
      {count > visible && (
        <span className="rounded-full bg-white/80 px-[3px] py-px text-[clamp(7px,2cqw,10px)] font-black text-stone-600">
          +{count - visible}
        </span>
      )}
    </div>
  );
}

function StoneStack({ pit, maxSmall, maxBig }: { pit: OAnQuanPit; maxSmall: number; maxBig: number }) {
  return (
    <div className="grid w-full justify-items-center gap-[2px]">
      <Pebbles count={pit.bigStones} type="big" max={maxBig} />
      <Pebbles count={pit.smallStones} type="small" max={maxSmall} />
    </div>
  );
}

function PitCount({ pit }: { pit: OAnQuanPit }) {
  return (
    <span className="grid min-w-[clamp(1.1rem,6cqw,1.5rem)] place-items-center rounded-full bg-white/90 px-[clamp(3px,1.5cqw,8px)] text-[clamp(8px,2.8cqw,11px)] font-black text-stone-700 shadow-sm [line-height:clamp(1.1rem,6cqw,1.5rem)]">
      {pit.smallStones + pit.bigStones * 10}
    </span>
  );
}

function DanPit({
  pit,
  selectable,
  selected,
  popup,
  popupNonce,
  countPosition,
  onSelect
}: {
  pit: OAnQuanPit;
  selectable: boolean;
  selected: boolean;
  popup?: string | null;
  popupNonce?: number;
  countPosition: "top" | "bottom";
  onSelect: () => void;
}) {
  return (
    <div className={`grid min-w-0 justify-items-center gap-[3px] ${countPosition === "top" ? "grid-rows-[auto_1fr]" : "grid-rows-[1fr_auto]"}`}>
      {countPosition === "top" && <PitCount pit={pit} />}
      <button
        type="button"
        disabled={!selectable}
        onClick={onSelect}
        className={`relative aspect-square w-full min-w-0 overflow-visible rounded-[clamp(0.5rem,3cqw,1rem)] border-2 shadow-sm transition ${
          selected
            ? "border-rose-400 bg-rose-100"
            : selectable
              ? "border-lime-400 bg-lime-100 hover:-translate-y-0.5"
              : "border-amber-200 bg-amber-50"
        }`}
      >
        {popup && (
          <span key={popupNonce} className="pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2 animate-[oaq-pop_900ms_ease-out_forwards] rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-rose-600 shadow-sm">
            {popup}
          </span>
        )}
        <div className="absolute inset-[clamp(3px,5%,8px)] flex items-center justify-center overflow-hidden">
          <StoneStack pit={pit} maxSmall={9} maxBig={2} />
        </div>
      </button>
      {countPosition === "bottom" && <PitCount pit={pit} />}
    </div>
  );
}

function QuanPit({ pit, popup, popupNonce }: { pit: OAnQuanPit; popup?: string | null; popupNonce?: number }) {
  return (
    <div className="grid h-full min-w-0 grid-rows-[auto_1fr_auto] justify-items-center gap-[3px]">
      <div className="[height:clamp(1.1rem,6cqw,1.5rem)]" />
      <div className="relative grid w-full min-w-0 place-items-center overflow-visible rounded-[clamp(1rem,5cqw,1.75rem)] border-2 border-stone-300 bg-gradient-to-br from-amber-100 to-lime-100 shadow-inner [padding:clamp(4px,4%,12px)]">
        {popup && (
          <span key={popupNonce} className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 animate-[oaq-pop_900ms_ease-out_forwards] rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-rose-600 shadow-sm">
            {popup}
          </span>
        )}
        <div className="grid min-w-0 w-full justify-items-center gap-1 overflow-hidden">
          <span className="text-[clamp(7px,2.5cqw,10px)] font-black uppercase text-stone-500">Quan</span>
          <StoneStack pit={pit} maxSmall={10} maxBig={3} />
        </div>
      </div>
      <PitCount pit={pit} />
    </div>
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
  const leftQuan = flipped ? board[6] : board[0];
  const rightQuan = flipped ? board[0] : board[6];
  const leftQuanIndex = flipped ? 6 : 0;
  const rightQuanIndex = flipped ? 0 : 6;

  function danPit(index: number) {
    const pit = board[index];
    const selectable = canMove && myPits.has(index) && pit.smallStones > 0;
    const selected = selectedPit === index;
    const countPosition = displayTopRow.includes(index) ? "top" : "bottom";
    return (
      <DanPit
        key={index}
        pit={pit}
        selectable={selectable}
        selected={selected}
        popup={popupPitIndex === index ? pitPopupText : null}
        popupNonce={popupNonce}
        countPosition={countPosition}
        onSelect={() => onSelectPit(index)}
      />
    );
  }

  return (
    <div className="@container relative overflow-hidden rounded-[clamp(1rem,4cqw,2rem)] border border-amber-200 bg-gradient-to-br from-amber-100 via-lime-50 to-emerald-100 p-[clamp(6px,2cqw,12px)] shadow-inner">
      <style>{`
        @keyframes oaq-pop {
          0% { opacity: 0; transform: translate(-50%, 8px) scale(0.86); }
          22% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -20px) scale(0.96); }
        }
      `}</style>
      {capturePopup && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 animate-[oaq-pop_1200ms_ease-out_forwards] rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-white shadow-lg">
          {capturePopup}
        </div>
      )}
      <div className="grid grid-cols-[clamp(2rem,12%,6rem)_minmax(0,1fr)_clamp(2rem,12%,6rem)] gap-[clamp(3px,1.5%,8px)]">
        <QuanPit pit={leftQuan} popup={popupPitIndex === leftQuanIndex ? pitPopupText : null} popupNonce={popupNonce} />
        <div className="grid min-w-0 gap-[clamp(3px,1.5%,8px)]">
          <div className="grid min-w-0 grid-cols-5 gap-[clamp(2px,1%,6px)]">{displayTopRow.map(danPit)}</div>
          <div className="grid min-w-0 grid-cols-5 gap-[clamp(2px,1%,6px)]">{displayBottomRow.map(danPit)}</div>
        </div>
        <QuanPit pit={rightQuan} popup={popupPitIndex === rightQuanIndex ? pitPopupText : null} popupNonce={popupNonce} />
      </div>
      <div className="mt-[clamp(6px,2cqw,12px)] flex justify-center gap-3">
        <button
          type="button"
          aria-label="Move left"
          disabled={selectedPit === null || !canMove}
          className="grid size-[clamp(2.5rem,12cqw,3rem)] place-items-center rounded-2xl bg-white text-slate-800 shadow-sm ring-1 ring-amber-200 transition disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onMove("counterclockwise")}
        >
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          aria-label="Move right"
          disabled={selectedPit === null || !canMove}
          className="grid size-[clamp(2.5rem,12cqw,3rem)] place-items-center rounded-2xl bg-[#ff7a90] text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onMove("clockwise")}
        >
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
