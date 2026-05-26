"use client";

import type { OAnQuanDirection, OAnQuanPit, OAnQuanSide } from "@/lib/games/o-an-quan/types";

const top = [11, 10, 9, 8, 7];
const bottom = [1, 2, 3, 4, 5];

function StoneStack({ pit }: { pit: OAnQuanPit }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {pit.bigStones > 0 && <span className="grid size-6 place-items-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow-sm">Q</span>}
      <span className="rounded-full bg-white/85 px-2 py-1 text-xs font-black text-stone-700">{pit.smallStones}</span>
    </div>
  );
}

function DanPit({
  pit,
  selectable,
  selected,
  onSelect
}: {
  pit: OAnQuanPit;
  selectable: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onSelect}
      className={`relative grid min-h-20 place-items-center rounded-2xl border-2 p-2 shadow-sm transition ${
        selected
          ? "border-rose-400 bg-rose-100"
          : selectable
            ? "border-lime-400 bg-lime-100 hover:-translate-y-0.5"
            : "border-amber-200 bg-amber-50"
      }`}
    >
      <StoneStack pit={pit} />
    </button>
  );
}

function QuanPit({ pit }: { pit: OAnQuanPit }) {
  return (
    <div className="grid min-h-40 place-items-center rounded-[2rem] border-2 border-stone-300 bg-gradient-to-br from-amber-100 to-lime-100 p-3 shadow-inner">
      <div className="grid justify-items-center gap-2">
        <span className="text-xs font-black uppercase text-stone-500">Quan</span>
        <StoneStack pit={pit} />
      </div>
    </div>
  );
}

export function OAnQuanBoard({
  board,
  mySide,
  canMove,
  selectedPit,
  onSelectPit,
  onMove
}: {
  board: OAnQuanPit[];
  mySide: OAnQuanSide;
  canMove: boolean;
  selectedPit: number | null;
  onSelectPit: (index: number) => void;
  onMove: (direction: OAnQuanDirection) => void;
}) {
  const myPits = new Set(mySide === "bottom" ? bottom : top);

  function danPit(index: number) {
    const pit = board[index];
    const selectable = canMove && myPits.has(index) && pit.smallStones > 0;
    const selected = selectedPit === index;
    return (
      <DanPit key={index} pit={pit} selectable={selectable} selected={selected} onSelect={() => onSelectPit(index)} />
    );
  }

  return (
    <div className="rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-100 via-lime-50 to-emerald-100 p-3 shadow-inner">
      <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-2 sm:grid-cols-[6rem_1fr_6rem]">
        <QuanPit pit={board[0]} />
        <div className="grid gap-2">
          <div className="grid grid-cols-5 gap-2">{top.map(danPit)}</div>
          <div className="grid grid-cols-5 gap-2">{bottom.map(danPit)}</div>
        </div>
        <QuanPit pit={board[6]} />
      </div>
      {selectedPit !== null && canMove && (
        <div className="mt-3 flex justify-center gap-2">
          <button type="button" className="rounded-2xl bg-white px-4 py-2 text-sm font-black shadow-sm ring-1 ring-amber-200" onClick={() => onMove("counterclockwise")}>
            Counterclockwise
          </button>
          <button type="button" className="rounded-2xl bg-[#ff7a90] px-4 py-2 text-sm font-black text-white shadow-sm" onClick={() => onMove("clockwise")}>
            Clockwise
          </button>
        </div>
      )}
    </div>
  );
}
