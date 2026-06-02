"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ElementKey, ElementalSnapshot } from "@/lib/games/elemental-duels/types";

export function ElementalOpponentPanel({
  snapshot,
  currentUserId,
  onSelectElement,
  onSelectMonster
}: {
  snapshot: ElementalSnapshot;
  currentUserId: string;
  onSelectElement: (element: ElementKey) => void;
  onSelectMonster: (monsterType: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const you = snapshot.players[currentUserId];
  const selectedElement = snapshot.catalog.elements.find((element) => element.id === you?.selectedSendElement);
  const selectedMonster = snapshot.catalog.monsters.find((monster) => monster.id === you?.selectedMonsterType);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-4 right-4 z-20 flex max-w-[13rem] items-center gap-2 rounded-full bg-white/95 px-4 py-3 text-left text-sm font-black text-slate-800 shadow-xl ring-1 ring-white/80 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-2xl"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-700">
          <Send size={17} />
        </span>
        <span className="min-w-0">
          <span className="block truncate">Send mobs</span>
          <span className="block truncate text-xs font-bold text-slate-400">
            {selectedElement?.label || "Element"} · {selectedMonster?.label || "Monster"}
          </span>
        </span>
      </button>

      {open && (
        <div className="absolute inset-0 z-40 grid place-items-center rounded-[1.5rem] bg-slate-950/28 p-3 backdrop-blur-sm" onPointerDown={() => setOpen(false)}>
          <div
            className="grid w-full max-w-sm gap-3 rounded-[1.6rem] border border-white/80 bg-white/96 p-4 text-left shadow-2xl"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black">Send mobs</p>
                <p className="text-xs font-bold text-slate-400">Killed mobs revive on rival side.</p>
              </div>
              <button type="button" aria-label="Close send menu" onClick={() => setOpen(false)} className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                <X size={15} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {snapshot.catalog.elements.map((element) => (
                <Button
                  key={element.id}
                  type="button"
                  variant={you?.selectedSendElement === element.id ? "primary" : "secondary"}
                  onClick={() => onSelectElement(element.id)}
                  className={`min-h-10 justify-center px-3 text-sm ${you?.selectedSendElement === element.id ? "ring-4 ring-orange-100" : ""}`}
                >
                  {element.label}
                </Button>
              ))}
            </div>

            <div className="grid max-h-[min(42vh,19rem)] gap-2 overflow-y-auto pr-1">
              {snapshot.catalog.monsters.map((monster) => (
                <button
                  key={monster.id}
                  type="button"
                  onClick={() => {
                    onSelectMonster(monster.id);
                    setOpen(false);
                  }}
                  className={`rounded-2xl px-3 py-2 text-left text-sm font-black shadow-sm ring-2 transition ${you?.selectedMonsterType === monster.id ? "bg-orange-100 text-orange-800 ring-orange-200" : "bg-slate-50 text-slate-600 ring-transparent hover:bg-orange-50"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>{monster.label}</span>
                    <span>{monster.sendCost}g</span>
                  </span>
                  <span className="mt-1 block text-xs font-bold opacity-70">{monster.element} · {monster.hp} HP</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
