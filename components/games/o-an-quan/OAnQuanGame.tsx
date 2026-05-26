"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { Button } from "@/components/ui/button";
import type { OAnQuanDirection, OAnQuanSnapshot } from "@/lib/games/o-an-quan/types";
import { OAnQuanBoard } from "./OAnQuanBoard";
import { useOAnQuanSocket } from "./useOAnQuanSocket";

function useNow(step = 250) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), step);
    return () => window.clearInterval(timer);
  }, [step]);
  return now;
}

export function OAnQuanGame({
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
  initialSnapshot?: OAnQuanSnapshot | null;
  roomStatus: "playing" | "ended";
}) {
  const { snapshot, error, connected, move, backToLobby } = useOAnQuanSocket(roomId, onGameEnd, initialSnapshot, roomStatus === "ended");
  const [selectedPit, setSelectedPit] = useState<number | null>(null);
  const [returning, setReturning] = useState(false);
  const now = useNow();
  const currentPlayer = snapshot?.players[currentUserId];
  const currentTurnPlayer = snapshot?.currentTurnUserId ? snapshot.players[snapshot.currentTurnUserId] : null;
  const isMyTurn = snapshot?.status === "playing" && snapshot.currentTurnUserId === currentUserId;
  const remainingMs = snapshot ? (now ? Math.max(0, snapshot.turnEndsAt - now) : snapshot.turnDurationSeconds * 1000) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const timerPercent = snapshot ? Math.max(0, Math.min(100, (remainingMs / (snapshot.turnDurationSeconds * 1000)) * 100)) : 0;
  const scores = useMemo(() => (snapshot ? Object.values(snapshot.players).sort((a) => (a.side === "top" ? -1 : 1)) : []), [snapshot]);

  function submit(direction: OAnQuanDirection) {
    if (!snapshot || selectedPit === null) return;
    move(snapshot.sessionId, selectedPit, direction);
    setSelectedPit(null);
  }

  const header = (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{connected ? "Connected" : "Reconnecting"}</span>
      {snapshot && (
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black text-slate-500">
            <span>{isMyTurn ? "Your turn" : `${currentTurnPlayer?.displayName || "Opponent"}'s turn`}</span>
            <span className={remainingSeconds <= 5 ? "text-red-500" : "text-slate-600"}>{remainingSeconds}s</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div className={`h-full rounded-full ${remainingSeconds <= 5 ? "bg-red-400" : "bg-[#ff7a90]"}`} style={{ width: `${timerPercent}%` }} />
          </div>
        </div>
      )}
    </div>
  );

  if (!snapshot) {
    return (
      <GameFullscreenShell expanded={expanded} onToggleExpanded={onToggleExpanded} header={header}>
        <div className="grid min-h-[22rem] place-items-center rounded-[1.5rem] bg-amber-50 font-black text-slate-600">
          {connected ? "Loading Ô Ăn Quan..." : "Connecting to Ô Ăn Quan..."}
        </div>
      </GameFullscreenShell>
    );
  }

  const winner = snapshot.winnerUserId ? snapshot.players[snapshot.winnerUserId] : null;

  return (
    <GameFullscreenShell expanded={expanded} onToggleExpanded={onToggleExpanded} header={header}>
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
      <div className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {scores.map((player) => (
            <div key={player.userId} className={`rounded-2xl px-4 py-3 text-sm font-black shadow-sm ${player.userId === currentUserId ? "bg-rose-50 text-rose-700" : "bg-white text-slate-700"}`}>
              {player.displayName} · {player.side} · {player.score} pts
            </div>
          ))}
        </div>
        <OAnQuanBoard board={snapshot.board} mySide={currentPlayer?.side || "bottom"} canMove={isMyTurn} selectedPit={selectedPit} onSelectPit={setSelectedPit} onMove={submit} />
        {snapshot.lastMove && (
          <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-bold text-slate-500">
            Last: {snapshot.players[snapshot.lastMove.userId]?.displayName || "Player"} {snapshot.lastMove.reason === "timeout" ? "lost the turn by timeout" : snapshot.lastMove.reason === "no_moves" ? "had no legal moves" : `captured ${snapshot.lastMove.captured} points`}
          </p>
        )}
        {snapshot.status === "ended" && (
          <div className="rounded-[2rem] bg-white p-5 text-center shadow-sm">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-amber-100 text-amber-600">
              <Trophy />
            </div>
            <p className="text-2xl font-black">{snapshot.result === "draw" ? "Draw!" : `${winner?.displayName || "Winner"} won`}</p>
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
      </div>
    </GameFullscreenShell>
  );
}
