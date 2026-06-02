"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Shuffle, Trash2, CheckCircle2 } from "lucide-react";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { GameResultDialog } from "@/components/games/game-result-dialog";
import { GameMuteButton, useGameAudio } from "@/components/games/use-game-audio";
import { Button } from "@/components/ui/button";
import { ToastPopup } from "@/components/ui/toast-popup";
import type { FleetCell, FleetShip, FleetShipDefinition, FleetSnapshot } from "@/lib/games/fleet-duel/types";
import { FleetBoard } from "./FleetBoard";
import { useFleetDuelSocket } from "./useFleetDuelSocket";

function key(cell: FleetCell) {
  return `${cell.x}:${cell.y}`;
}

function normalizeShape(cells: FleetCell[]) {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  return cells.map((cell) => ({ x: cell.x - minX, y: cell.y - minY }));
}

function rotateShape(cells: FleetCell[], turns: number) {
  let rotated = cells.map((cell) => ({ ...cell }));
  for (let turn = 0; turn < turns; turn += 1) {
    rotated = rotated.map((cell) => ({ x: cell.y, y: -cell.x }));
  }
  return normalizeShape(rotated);
}

function makeShip(definition: FleetShipDefinition, start: FleetCell, rotation: number): FleetShip {
  const shape = rotateShape(definition.shape, rotation);
  return {
    id: definition.id,
    size: definition.size,
    cells: shape.map((cell) => ({
      x: start.x + cell.x,
      y: start.y + cell.y
    })),
    hits: [],
    sunk: false
  };
}

function randomFleetWithBlocked(blockedCells: FleetCell[], definitions: FleetShipDefinition[], boardSize: number) {
  const ships: FleetShip[] = [];
  const occupied = new Set<string>();
  const blocked = new Set(blockedCells.map(key));
  for (const definition of definitions) {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const rotation = Math.floor(Math.random() * 4);
      const shape = rotateShape(definition.shape, rotation);
      const width = Math.max(...shape.map((cell) => cell.x)) + 1;
      const height = Math.max(...shape.map((cell) => cell.y)) + 1;
      const start = { x: Math.floor(Math.random() * (boardSize - width + 1)), y: Math.floor(Math.random() * (boardSize - height + 1)) };
      const ship = makeShip(definition, start, rotation);
      if (ship.cells.every((cell) => !occupied.has(key(cell)) && !blocked.has(key(cell)))) {
        ships.push(ship);
        ship.cells.forEach((cell) => occupied.add(key(cell)));
        break;
      }
    }
  }
  return ships;
}

function nextUnplaced(ships: FleetShip[], definitions: FleetShipDefinition[]) {
  return definitions.find((ship) => !ships.some((placed) => placed.id === ship.id)) || null;
}

function useNow(step = 250) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), step);
    return () => window.clearInterval(timer);
  }, [step]);
  return now;
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
  const [rotation, setRotation] = useState(0);
  const [returning, setReturning] = useState(false);
  const [turnNotice, setTurnNotice] = useState(false);
  const lastTurnRef = useRef<string | null>(initialSnapshot?.currentTurnUserId ?? null);
  const previousStatusRef = useRef<string | null>(initialSnapshot?.status ?? null);
  const previousShotsRef = useRef(0);
  const { muted, setMuted, playTone } = useGameAudio("fleet-duel-muted");
  const selectedShip = nextUnplaced(localShips, snapshot?.shipDefinitions || []);
  const now = useNow();
  const enemyShotsOnMe = useMemo(() => snapshot?.opponent?.shots.filter((shot) => shot.targetUserId === currentUserId) || [], [currentUserId, snapshot]);
  const myShots = snapshot?.you.shots || [];
  const canFire = snapshot?.status === "battle" && snapshot.currentTurnUserId === currentUserId;
  const winner = snapshot?.players.find((player) => player.userId === snapshot.winnerUserId);
  const remainingMs = snapshot?.status === "battle" ? (now ? Math.max(0, snapshot.turnEndsAt - now) : snapshot.turnDurationSeconds * 1000) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const timerPercent = snapshot?.status === "battle" ? Math.max(0, Math.min(100, (remainingMs / (snapshot.turnDurationSeconds * 1000)) * 100)) : 0;

  function placeLocal(cell: FleetCell) {
    if (!snapshot || snapshot.status !== "setup" || snapshot.you.readyToBattle || !selectedShip) return;
    const ship = makeShip(selectedShip, cell, rotation);
    if (ship.cells.some((candidate) => candidate.x < 0 || candidate.y < 0 || candidate.x >= snapshot.boardSize || candidate.y >= snapshot.boardSize)) return;
    const occupied = new Set(localShips.flatMap((placed) => placed.cells.map(key)));
    const blocked = new Set(snapshot.blockedCells.map(key));
    if (ship.cells.some((candidate) => occupied.has(key(candidate)) || blocked.has(key(candidate)))) return;
    setLocalShips((value) => [...value, ship]);
  }

  function sendShips(ships: FleetShip[]) {
    if (!snapshot) return;
    setLocalShips(ships);
    placeShips(snapshot.sessionId, ships);
  }

  useEffect(() => {
    if (!snapshot) return;
    const previousTurn = lastTurnRef.current;
    lastTurnRef.current = snapshot.currentTurnUserId;
    if (snapshot.status !== "battle" || snapshot.currentTurnUserId !== currentUserId || previousTurn === currentUserId) return;
    playTone("turn");
    const showTimer = window.setTimeout(() => setTurnNotice(true), 0);
    const hideTimer = window.setTimeout(() => setTurnNotice(false), 1700);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [currentUserId, playTone, snapshot?.currentTurnUserId, snapshot?.status, snapshot]);

  useEffect(() => {
    if (!snapshot) return;
    const shotCount = snapshot.you.shots.length + (snapshot.opponent?.shots.length ?? 0);
    if (shotCount > previousShotsRef.current) playTone("hit");
    previousShotsRef.current = shotCount;
    if (previousStatusRef.current !== "ended" && snapshot.status === "ended") playTone("end");
    previousStatusRef.current = snapshot.status;
  }, [playTone, snapshot]);

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
            {snapshot.status === "battle" && (
              <div className="mt-2 max-w-xs">
                <div className="mb-1 flex justify-between text-xs font-black text-slate-500">
                  <span>{canFire ? "Your timer" : "Opponent timer"}</span>
                  <span className={remainingSeconds <= 5 ? "text-red-500" : "text-cyan-700"}>{remainingSeconds}s</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div className={`h-full rounded-full ${remainingSeconds <= 5 ? "bg-red-400" : "bg-cyan-400"}`} style={{ width: `${timerPercent}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">{snapshot.status.toUpperCase()}</span>
            <GameMuteButton muted={muted} onToggle={() => setMuted((value) => !value)} label="Fleet Duel" />
          </div>
        </div>
      }
    >
      <ToastPopup message={error} />
      <GameResultDialog
        open={snapshot.status === "ended"}
        title={winner?.userId === currentUserId ? "You won!" : `${winner?.displayName || "Opponent"} won`}
        subtitle="Fleet Duel ended."
        isHost={isHost}
        returning={returning}
        onBackToLobby={() => {
          setReturning(true);
          backToLobby();
        }}
        tone="cyan"
      />
      {turnNotice && (
        <div className="pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2 animate-[fleet-turn_1600ms_ease-out_forwards] rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-xl">
          Your turn
        </div>
      )}
      <style>{`
        @keyframes fleet-turn {
          0% {
            opacity: 0;
            transform: translate(-50%, 12px) scale(0.92);
          }
          18% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
          80% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -12px) scale(0.96);
          }
        }
      `}</style>

      {snapshot.status === "setup" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="rounded-3xl border border-cyan-100/70 bg-gradient-to-br from-white via-cyan-50/80 to-sky-50 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black">Your board</p>
                <p className="text-sm font-bold text-slate-500">{selectedShip ? `Place ${selectedShip.label} (${selectedShip.size})` : "Fleet placed"}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setRotation((value) => (value + 1) % 4)}>
                <RotateCcw size={16} /> Rotate
              </Button>
            </div>
            <FleetBoard boardSize={snapshot.boardSize} ships={ownShips} shots={enemyShotsOnMe} blockedCells={snapshot.blockedCells} theme={snapshot.boardTheme} mode="own" disabled={snapshot.you.readyToBattle} onCellClick={placeLocal} />
          </div>
          <div className="grid content-start gap-3 rounded-3xl border border-cyan-100/70 bg-gradient-to-br from-white via-cyan-50/70 to-sky-50 p-4 shadow-sm">
            <Button type="button" variant="secondary" onClick={() => sendShips(randomFleetWithBlocked(snapshot.blockedCells, snapshot.shipDefinitions, snapshot.boardSize))} disabled={snapshot.you.readyToBattle}>
              <Shuffle size={16} /> Random Placement
            </Button>
            <Button type="button" variant="secondary" onClick={() => setLocalShips([])} disabled={snapshot.you.readyToBattle}>
              <Trash2 size={16} /> Clear
            </Button>
            <Button
              type="button"
              disabled={ownShips.length !== snapshot.shipDefinitions.length || snapshot.you.readyToBattle}
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
            <FleetBoard boardSize={snapshot.boardSize} ships={snapshot.opponent.ships} shots={myShots} blockedCells={snapshot.blockedCells} theme={snapshot.boardTheme} mode="enemy" disabled={!canFire} onCellClick={(cell) => fire(snapshot.sessionId, cell)} />
          </div>
          <div className="rounded-3xl border border-cyan-100/70 bg-gradient-to-br from-white via-cyan-50/80 to-sky-50 p-4 shadow-sm">
            <p className="mb-3 font-black">Your fleet</p>
            <FleetBoard boardSize={snapshot.boardSize} ships={snapshot.you.ships} shots={enemyShotsOnMe} blockedCells={snapshot.blockedCells} theme={snapshot.boardTheme} mode="own" disabled />
          </div>
        </div>
      )}

    </GameFullscreenShell>
  );
}
