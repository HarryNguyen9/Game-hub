"use client";

import type { ElementKey, ElementalSnapshot } from "@/lib/games/elemental-duels/types";
import { Button } from "@/components/ui/button";

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
            className="justify-center"
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
            className={`rounded-2xl px-3 py-2 text-left text-sm font-black shadow-sm ${you?.selectedMonsterType === monster.id ? "bg-orange-100 text-orange-800" : "bg-slate-50 text-slate-600"}`}
          >
            {monster.label} · {monster.sendCost}g
          </button>
        ))}
      </div>
    </div>
  );
}
