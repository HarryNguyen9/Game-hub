"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import type { GameConfig } from "@/lib/constants";

function gameTypeLabel(game: GameConfig) {
  if (game.gameType === "turn-based") return "Turn-based";
  if (game.gameType === "realtime") return "Realtime";
  if (game.gameType === "realtime-strategy") return "Strategy";
  return "Watch room";
}

export function GameRulesModal({
  game,
  onClose
}: {
  game: GameConfig;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${game.name} rules`}>
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className={`shrink-0 bg-gradient-to-br ${game.accent} p-5`}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/80 text-xl shadow-sm">{game.icon}</span>
                <div className="flex min-w-0 flex-nowrap items-center gap-2">
                  <span className="whitespace-nowrap rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-black uppercase text-slate-700 shadow-sm sm:px-3 sm:text-xs">{game.minPlayers}-{game.maxPlayers} players</span>
                  <span className="whitespace-nowrap rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-black uppercase text-slate-700 shadow-sm sm:px-3 sm:text-xs">{gameTypeLabel(game)}</span>
                </div>
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-950">{game.name}</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{game.description}</p>
              {"turnDurationLabel" in game && <p className="mt-2 text-xs font-black uppercase text-slate-600">{game.turnDurationLabel}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close rules"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white/85 text-slate-600 shadow-sm transition hover:bg-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
          <section className="rounded-[1.5rem] bg-slate-50 p-4 sm:col-span-2">
            <p className="text-xs font-black uppercase tracking-wide text-[#ff7a90]">Goal</p>
            <p className="mt-2 text-base font-black leading-7 text-slate-900">{game.howToPlay.goal}</p>
          </section>
          <section className="rounded-[1.5rem] bg-sky-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">How to play</p>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-600">
              {game.howToPlay.controls.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-[1.5rem] bg-amber-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">Rules</p>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-600">
              {game.howToPlay.rules.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export function GameRulesInfoButton({
  game,
  className = ""
}: {
  game: GameConfig;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={`How to play ${game.name}`}
        title={`How to play ${game.name}`}
        className={`grid size-8 shrink-0 place-items-center rounded-full bg-white/92 text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-sky-50 hover:text-sky-700 ${className}`}
      >
        <Info size={15} />
      </button>
      {open && <GameRulesModal game={game} onClose={() => setOpen(false)} />}
    </>
  );
}
