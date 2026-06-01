"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { Button } from "@/components/ui/button";
import type { ElementalSnapshot, Point } from "@/lib/games/elemental-duels/types";
import { ElementalBuildPanel } from "./ElementalBuildPanel";
import { ElementalDuelsPhaser } from "./ElementalDuelsPhaser";
import { ElementalHud } from "./ElementalHud";
import { ElementalOpponentPanel } from "./ElementalOpponentPanel";
import { useElementalDuelsSocket } from "./useElementalDuelsSocket";

export function ElementalDuelsGame({
  roomId,
  currentUserId,
  isHost,
  onGameEnd,
  expanded,
  onToggleExpanded,
  initialSnapshot,
  roomStatus
}: {
  roomId: string;
  currentUserId: string;
  isHost: boolean;
  onGameEnd?: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  initialSnapshot?: ElementalSnapshot | null;
  roomStatus: "playing" | "ended";
}) {
  const { snapshot, error, connected, buildTower, upgradeTower, sellTower, selectSendElement, selectMonsterType, backToLobby } = useElementalDuelsSocket(roomId, onGameEnd, initialSnapshot, roomStatus === "ended");
  const [selectedTile, setSelectedTile] = useState<Point | null>(null);
  const winner = useMemo(() => (snapshot?.winnerUserId ? snapshot.players[snapshot.winnerUserId] : null), [snapshot]);

  if (!snapshot) {
    return (
      <div className="mt-4 grid min-h-[22rem] place-items-center rounded-[1.5rem] bg-orange-50 text-center font-black text-slate-600">
        {connected ? "Loading Elemental Duels..." : "Connecting to Elemental Duels..."}
      </div>
    );
  }

  return (
    <GameFullscreenShell
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
      header={
        <div className="min-w-0">
          <p className="text-sm font-black text-orange-600">{connected ? "Elemental server connected" : "Reconnecting"}</p>
          <h3 className="truncate text-2xl font-black">Elemental Duels 2D</h3>
          <p className="text-sm font-bold text-slate-500">{snapshot.map.label} · {snapshot.status}</p>
        </div>
      }
      footer={
        <div className="grid justify-items-center gap-3">
          <p className="text-center text-sm font-bold text-slate-500">Build towers, counter elements, and send defeated monsters to your rival.</p>
        </div>
      }
    >
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
      <ElementalHud snapshot={snapshot} currentUserId={currentUserId} connected={connected} />
      <div className="grid gap-4 xl:grid-cols-[1fr_19rem]">
        <div className="relative">
          <ElementalDuelsPhaser snapshot={snapshot} currentUserId={currentUserId} onSelectTile={setSelectedTile} />
          {snapshot.status === "ended" && (
            <div className="absolute inset-0 grid place-items-center rounded-[1.5rem] bg-white/72 p-4 backdrop-blur-[2px]">
              <div className="w-full max-w-sm rounded-[2rem] bg-white p-5 text-center shadow-xl">
                <p className="text-sm font-black uppercase text-orange-500">Duel ended</p>
                <p className="mt-2 text-2xl font-black">{winner ? `${winner.displayName} wins!` : "Draw"}</p>
                <p className="mt-1 text-sm font-bold text-slate-500">{snapshot.endReason || "The duel is over."}</p>
                {isHost ? (
                  <Button className="mt-4 w-full justify-center" onClick={backToLobby}>
                    <RotateCcw size={16} /> Back to Lobby
                  </Button>
                ) : (
                  <p className="mt-4 text-sm font-bold text-slate-500">Waiting for host to return to lobby.</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="grid content-start gap-4">
          <ElementalBuildPanel snapshot={snapshot} currentUserId={currentUserId} selectedTile={selectedTile} onBuild={buildTower} onUpgrade={upgradeTower} onSell={sellTower} />
          <ElementalOpponentPanel snapshot={snapshot} currentUserId={currentUserId} onSelectElement={selectSendElement} onSelectMonster={selectMonsterType} />
        </div>
      </div>
    </GameFullscreenShell>
  );
}
