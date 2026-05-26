"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { OAnQuanDirection, OAnQuanPit, OAnQuanSide } from "@/lib/games/o-an-quan/types";

const top = [11, 10, 9, 8, 7];
const bottom = [1, 2, 3, 4, 5];

function Pebbles({ count, type }: { count: number; type: "small" | "big" }) {
  const visible = Math.min(count, type === "big" ? 3 : 18);
  if (count <= 0) return null;
  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-0.5">
      {Array.from({ length: visible }).map((_, index) => (
        <span
          key={`${type}-${index}`}
          className={
            type === "big"
              ? "size-4 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 shadow-sm ring-1 ring-amber-600/20"
              : "size-2.5 rounded-full bg-gradient-to-br from-stone-50 via-amber-100 to-stone-300 shadow-[0_1px_0_rgba(0,0,0,0.12)] ring-1 ring-stone-300/50"
          }
        />
      ))}
      {count > visible && <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-black text-stone-600">+{count - visible}</span>}
    </div>
  );
}

function StoneStack({ pit }: { pit: OAnQuanPit }) {
  return (
    <div className="grid w-full justify-items-center gap-1">
      <Pebbles count={pit.bigStones} type="big" />
      <Pebbles count={pit.smallStones} type="small" />
    </div>
  );
}

function PitCount({ pit }: { pit: OAnQuanPit }) {
  return <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white/90 px-2 text-[11px] font-black text-stone-700 shadow-sm">{pit.smallStones + pit.bigStones * 10}</span>;
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
    <div className={`grid min-w-0 justify-items-center gap-1 ${countPosition === "top" ? "grid-rows-[auto_1fr]" : "grid-rows-[1fr_auto]"}`}>
      {countPosition === "top" && <PitCount pit={pit} />}
      <button
        type="button"
        disabled={!selectable}
        onClick={onSelect}
        className={`relative grid h-16 w-full min-w-0 place-items-center overflow-visible rounded-2xl border-2 p-1.5 shadow-sm transition sm:h-20 sm:p-2 ${
          selected
            ? "border-rose-400 bg-rose-100"
            : selectable
              ? "border-lime-400 bg-lime-100 hover:-translate-y-0.5"
              : "border-amber-200 bg-amber-50"
        }`}
      >
        {popup && <span key={popupNonce} className="pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2 animate-[oaq-pop_900ms_ease-out_forwards] rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-rose-600 shadow-sm">{popup}</span>}
        <StoneStack pit={pit} />
      </button>
      {countPosition === "bottom" && <PitCount pit={pit} />}
    </div>
  );
}

function QuanPit({ pit, popup, popupNonce }: { pit: OAnQuanPit; popup?: string | null; popupNonce?: number }) {
  return (
    <div className="grid min-w-0 justify-items-center gap-1">
      <div className="relative grid h-32 w-full min-w-0 place-items-center overflow-visible rounded-[1.75rem] border-2 border-stone-300 bg-gradient-to-br from-amber-100 to-lime-100 p-2 shadow-inner sm:h-40 sm:rounded-[2rem] sm:p-3">
        {popup && <span key={popupNonce} className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 animate-[oaq-pop_900ms_ease-out_forwards] rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-rose-600 shadow-sm">{popup}</span>}
        <div className="grid min-w-0 justify-items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] font-black uppercase text-stone-500 sm:text-xs">Quan</span>
          <StoneStack pit={pit} />
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
  capturePopup?: string | null;
  onSelectPit: (index: number) => void;
  onMove: (direction: OAnQuanDirection) => void;
}) {
  const myPits = new Set(mySide === "bottom" ? bottom : top);

  function danPit(index: number) {
    const pit = board[index];
    const selectable = canMove && myPits.has(index) && pit.smallStones > 0;
    const selected = selectedPit === index;
    const countPosition = top.includes(index) ? "top" : "bottom";
    return (
      <DanPit key={index} pit={pit} selectable={selectable} selected={selected} popup={popupPitIndex === index ? "+1" : null} popupNonce={popupNonce} countPosition={countPosition} onSelect={() => onSelectPit(index)} />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-100 via-lime-50 to-emerald-100 p-2 shadow-inner sm:p-3">
      <style>{`
        @keyframes oaq-pop {
          0% {
            opacity: 0;
            transform: translate(-50%, 8px) scale(0.86);
          }
          22% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -20px) scale(0.96);
          }
        }
      `}</style>
      {capturePopup && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 animate-[oaq-pop_1200ms_ease-out_forwards] rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-white shadow-lg">
          {capturePopup}
        </div>
      )}
      <div className="grid grid-cols-[3.45rem_minmax(0,1fr)_3.45rem] items-center gap-1.5 sm:grid-cols-[6rem_minmax(0,1fr)_6rem] sm:gap-2">
        <QuanPit pit={board[0]} popup={popupPitIndex === 0 ? "+1" : null} popupNonce={popupNonce} />
        <div className="grid min-w-0 gap-1.5 sm:gap-2">
          <div className="grid min-w-0 grid-cols-5 gap-1 sm:gap-2">{top.map(danPit)}</div>
          <div className="grid min-w-0 grid-cols-5 gap-1 sm:gap-2">{bottom.map(danPit)}</div>
        </div>
        <QuanPit pit={board[6]} popup={popupPitIndex === 6 ? "+1" : null} popupNonce={popupNonce} />
      </div>
      <div className="mt-3 flex justify-center gap-3">
        <button
          type="button"
          aria-label="Move left"
          disabled={selectedPit === null || !canMove}
          className="grid size-12 place-items-center rounded-2xl bg-white text-slate-800 shadow-sm ring-1 ring-amber-200 transition disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onMove("counterclockwise")}
        >
          <ArrowLeft size={22} />
        </button>
        <button
          type="button"
          aria-label="Move right"
          disabled={selectedPit === null || !canMove}
          className="grid size-12 place-items-center rounded-2xl bg-[#ff7a90] text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => onMove("clockwise")}
        >
          <ArrowRight size={22} />
        </button>
      </div>
    </div>
  );
}
