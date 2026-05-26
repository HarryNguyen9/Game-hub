"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Shuffle, Trash2, Ship, CheckCircle2 } from "lucide-react";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { Button } from "@/components/ui/button";
import { FLEET_CONFIG } from "@/lib/games/fleet-duel/config";
import type { FleetCell, FleetShip, FleetSnapshot } from "@/lib/games/fleet-duel/types";
import { FleetBoard } from "./FleetBoard";
import { useFleetDuelSocket } from "./useFleetDuelSocket";

function key(cell: FleetCell) {
  return `${cell.x}:${cell.y}`;
}

function makeShip(id: string, size: number, start: FleetCell, vertical: boolean): FleetShip {
  return {
    id,
    size,
    cells: Array.from({ length: size }).map((_, index) => ({
      x: start.x + (vertical ? 0 : index),
      y: start.y + (vertical ? index : 0)
    })),
    hits: [],
    sunk: false
  };
}

function randomFleet() {
  const ships: FleetShip[] = [];
  const occupied = new Set<string>();
  for (const config of FLEET_CONFIG.ships) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const vertical = Math.random() > 0.5;
      const start = {
        x: Math.floor(Math.random() * (vertical ? FLEET_CONFIG.boardSize : FLEET_CONFIG.boardSize - config.size + 1)),
        y: Math.floor(Math.random() * (vertical ? FLEET_CONFIG.boardSize - config.size + 1 : FLEET_CONFIG.boardSize))
      };
      const ship = makeShip(config.id, config.size, start, vertical);
      if (ship.cells.every((cell) => !occupied.has(key(cell)))) {
        ships.push(ship);
        ship.cells.forEach((cell) => occupied.add(key(cell)));
        break;
      }
    }
  }
  return ships;
}

function nextUnplaced(ships: FleetShip[]) {
  return FLEET_CONFIG.ships.find((ship) => !ships.some((placed) => placed.id === ship.id)) || null;
}

export function FleetDuelGame({
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
  initialSnapshot?: FleetSnapshot | null;
  roomStatus: "playing" | "ended";
}) {
  const { snapshot, error, connected, placeShips, confirmReady, fire, backToLobby } = useFleetDuelSocket(roomId, currentUserId, onGameEnd, initialSnapshot, roomStatus === "ended");
  const [localShips, setLocalShips] = useState<FleetShip[]>([]);
  const [vertical, setVertical] = useState(false);
  const [returning, setReturning] = useState(false);
  const selectedShip = nextUnplaced(localShips);
  const enemyShotsOnMe = useMemo(() => snapshot?.opponent?.shots.filter((shot) => shot.targetUserId === currentUserId) || [], [currentUserId, snapshot]);
  const myShots = snapshot?.you.shots || [];
  const canFire = snapshot?.status === "battle" && snapshot.currentTurnUserId === currentUserId;
  const winner = snapshot?.players.find((player) => player.userId === snapshot.winnerUserId);

  function placeLocal(cell: FleetCell) {
    if (!snapshot || snapshot.status !== "setup" || snapshot.you.readyToBattle || !selectedShip) return;
    const ship = makeShip(selectedShip.id, selectedShip.size, cell, vertical);
    if (ship.cells.some((candidate) => candidate.x < 0 || candidate.y < 0 || candidate.x >= FLEET_CONFIG.boardSize || candidate.y >= FLEET_CONFIG.boardSize)) return;
    const occupied = new Set(localShips.flatMap((placed) => placed.cells.map(key)));
    if (ship.cells.some((candidate) => occupied.has(key(candidate)))) return;
    setLocalShips((value) => [...value, ship]);
  }

  function sendShips(ships: FleetShip[]) {
    if (!snapshot) return;
    setLocalShips(ships);
    placeShips(snapshot.sessionId, ships);
  }

  if (!snapshot) {
    return (
      <div className="mt-4 grid min-h-[22rem] place-items-center rounded-[1.5rem] bg-cyan-50 text-center font-black text-slate-600">
        {connected ? "Loading Fleet Duel..." : "Connecting to Fleet Duel..."}
      </div>
    );
  }

  const ownShips = localShips.length ? localShips : snapshot.you.ships.map((ship) => ({ ...ship, cells: ship.cells || [], hits: ship.hits }));

  return (
    <GameFullscreenShell
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
      header={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-black text-cyan-700">{connected ? "Fleet server connected" : "Reconnecting"}</p>
            <h3 className="text-2xl font-black">Fleet Duel</h3>
            <p className="text-sm font-bold text-slate-500">
              {snapshot.status === "setup" ? "Place your fleet." : snapshot.status === "battle" ? (canFire ? "Your turn." : "Opponent's turn.") : "Battle ended."}
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">{snapshot.status.toUpperCase()}</span>
        </div>
      }
    >
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}

      {snapshot.status === "setup" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="rounded-3xl border border-cyan-100/70 bg-gradient-to-br from-white via-cyan-50/80 to-sky-50 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black">Your board</p>
                <p className="text-sm font-bold text-slate-500">{selectedShip ? `Place ${selectedShip.id} (${selectedShip.size})` : "Fleet placed"}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setVertical((value) => !value)}>
                <RotateCcw size={16} /> {vertical ? "Vertical" : "Horizontal"}
              </Button>
            </div>
            <FleetBoard boardSize={snapshot.boardSize} ships={ownShips} shots={enemyShotsOnMe} mode="own" disabled={snapshot.you.readyToBattle} onCellClick={placeLocal} />
          </div>
          <div className="grid content-start gap-3 rounded-3xl border border-cyan-100/70 bg-gradient-to-br from-white via-cyan-50/70 to-sky-50 p-4 shadow-sm">
            <Button type="button" variant="secondary" onClick={() => sendShips(randomFleet())} disabled={snapshot.you.readyToBattle}>
              <Shuffle size={16} /> Random Placement
            </Button>
            <Button type="button" variant="secondary" onClick={() => setLocalShips([])} disabled={snapshot.you.readyToBattle}>
              <Trash2 size={16} /> Clear
            </Button>
            <Button
              type="button"
              disabled={ownShips.length !== FLEET_CONFIG.ships.length || snapshot.you.readyToBattle}
              onClick={() => {
                if (!snapshot) return;
                placeShips(snapshot.sessionId, ownShips);
                confirmReady(snapshot.sessionId);
              }}
            >
              <CheckCircle2 size={16} /> {snapshot.you.readyToBattle ? "Confirmed" : "Confirm Fleet"}
            </Button>
            <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-500">
              {snapshot.players.map((player) => `${player.displayName}: ${player.readyToBattle ? "Ready" : "Placing"}`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {snapshot.status === "battle" && snapshot.opponent && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-cyan-100/70 bg-gradient-to-br from-white via-cyan-50/80 to-sky-50 p-4 shadow-sm">
            <p className="mb-3 font-black">Enemy waters</p>
            <FleetBoard boardSize={snapshot.boardSize} ships={snapshot.opponent.ships} shots={myShots} mode="enemy" disabled={!canFire} onCellClick={(cell) => fire(snapshot.sessionId, cell)} />
          </div>
          <div className="rounded-3xl border border-cyan-100/70 bg-gradient-to-br from-white via-cyan-50/80 to-sky-50 p-4 shadow-sm">
            <p className="mb-3 font-black">Your fleet</p>
            <FleetBoard boardSize={snapshot.boardSize} ships={snapshot.you.ships} shots={enemyShotsOnMe} mode="own" disabled />
          </div>
        </div>
      )}

      {snapshot.status === "ended" && (
        <div className="rounded-[2rem] bg-white p-5 text-center shadow-sm">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-cyan-100 text-2xl">
            <Ship />
          </div>
          <p className="text-2xl font-black">{winner?.userId === currentUserId ? "You won!" : `${winner?.displayName || "Opponent"} won`}</p>
          {isHost ? (
            <Button
              className="mt-4"
              disabled={returning}
              onClick={() => {
                setReturning(true);
                backToLobby();
              }}
            >
              <RotateCcw size={16} /> Back to Lobby
            </Button>
          ) : (
            <p className="mt-3 text-sm font-bold text-slate-500">Waiting for host to return to lobby.</p>
          )}
        </div>
      )}
    </GameFullscreenShell>
  );
}
