"use client";

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
  const you = snapshot.players[currentUserId];
  return (
    <div className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm">
      <div>
        <p className="font-black">Send profile</p>
        <p className="text-sm font-bold text-slate-500">Killed monsters revive on the rival field.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {snapshot.catalog.elements.map((element) => (
          <Button
            key={element.id}
            type="button"
            variant={you?.selectedSendElement === element.id ? "primary" : "secondary"}
            onClick={() => onSelectElement(element.id)}
            className={`min-h-11 justify-center ${you?.selectedSendElement === element.id ? "ring-4 ring-orange-100" : ""}`}
          >
            {element.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-2">
        {snapshot.catalog.monsters.map((monster) => (
          <button
            key={monster.id}
            type="button"
            onClick={() => onSelectMonster(monster.id)}
            className={`rounded-2xl px-3 py-2 text-left text-sm font-black shadow-sm ring-2 transition ${you?.selectedMonsterType === monster.id ? "bg-orange-100 text-orange-800 ring-orange-200" : "bg-slate-50 text-slate-600 ring-transparent"}`}
          >
            <span className="flex items-center justify-between gap-2">
              <span>{monster.label}</span>
              <span>{monster.sendCost}g</span>
            </span>
            <span className="mt-1 block text-xs font-bold opacity-70">{monster.element} - {monster.hp} HP - {monster.speed.toFixed(2)} speed</span>
          </button>
        ))}
      </div>
    </div>
  );
}
