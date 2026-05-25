"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderFlappyDuel } from "./renderFlappyDuel";
import { useFlappyDuelSocket } from "./useFlappyDuelSocket";

export function FlappyDuelGame({
  roomId,
  currentUserId,
  isHost,
  onGameEnd,
  expanded,
  onToggleExpanded
}: {
  roomId: string;
  currentUserId: string;
  isHost: boolean;
  onGameEnd?: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { snapshot, countdown, error, connected, flap, backToLobby } = useFlappyDuelSocket(roomId, currentUserId, onGameEnd);
  const [returning, setReturning] = useState(false);
  const currentPlayer = snapshot?.players[currentUserId];
  const ended = snapshot?.status === "ended";

  useEffect(() => {
    if (!snapshot || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    canvas.width = snapshot.config.worldWidth;
    canvas.height = snapshot.config.worldHeight;
    renderFlappyDuel(context, snapshot, currentUserId);
  }, [currentUserId, snapshot]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space") return;
      event.preventDefault();
      flap();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flap]);

  return (
    <div className={expanded ? "fixed inset-0 z-50 flex h-dvh flex-col gap-3 overflow-y-auto bg-white p-3" : "relative mt-4 grid gap-4"}>
      <Button
        type="button"
        variant="secondary"
        className="absolute right-4 top-4 z-20 grid size-11 shrink-0 place-items-center rounded-2xl bg-white/92 p-0 shadow-sm"
        onClick={onToggleExpanded}
        aria-label={expanded ? "Exit full screen" : "Open full screen"}
        title={expanded ? "Small" : "Full"}
      >
        {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </Button>
      <div className="flex flex-col gap-3 rounded-3xl bg-slate-50 px-4 py-3 pr-20 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-black text-slate-600">{connected ? "Game server connected" : "Connecting game server..."}</span>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
          <div className="flex min-w-0 flex-1 flex-wrap gap-2 sm:flex-none sm:justify-end">
            {snapshot?.leaderboard.map((player) => (
              <span key={player.userId} className="max-w-[9rem] truncate rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
                {player.displayName}: {player.score}
              </span>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
      <div className={expanded ? "relative grid min-h-[68dvh] flex-1 place-items-center overflow-hidden rounded-[1.5rem] bg-sky-100 shadow-inner max-[700px]:min-h-[74dvh] max-[700px]:landscape:min-h-[66dvh]" : "relative overflow-hidden rounded-[1.5rem] bg-sky-100 shadow-inner"}>
        <canvas
          ref={canvasRef}
          onPointerDown={flap}
          className={expanded ? "block h-auto max-h-full w-full touch-manipulation object-contain" : "block aspect-[900/520] w-full touch-manipulation"}
          aria-label="Flappy Duel game canvas"
        />
        {countdown && (
          <div className="absolute inset-0 grid place-items-center bg-white/35 text-7xl font-black text-[#ff7a90]">{countdown}</div>
        )}
        {!snapshot && !countdown && <div className="absolute inset-0 grid place-items-center font-black text-slate-600">Waiting for game snapshot...</div>}
        {currentPlayer && !currentPlayer.alive && !ended && (
          <div className="absolute left-4 top-4 rounded-2xl bg-white/90 px-4 py-2 text-sm font-black text-red-500">You crashed. Spectating...</div>
        )}
        {ended && snapshot && (
          <div className="absolute inset-0 grid place-items-center bg-white/82 p-4">
            <div className="w-full max-w-sm rounded-[2rem] bg-white p-5 text-center shadow-xl">
              <p className="text-2xl font-black">Round ended</p>
              <div className="mt-4 grid gap-2 text-left">
                {snapshot.leaderboard.map((player, index) => (
                  <div key={player.userId} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black">
                    <span>
                      #{index + 1} {player.displayName}
                    </span>
                    <span>{player.score}</span>
                  </div>
                ))}
              </div>
              {isHost && (
                <Button
                  className="mt-4 w-full"
                  disabled={returning}
                  onClick={() => {
                    if (returning) return;
                    setReturning(true);
                    backToLobby();
                  }}
                >
                  <RotateCcw size={18} /> {returning ? "Returning..." : "Back to Lobby"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-sm font-semibold text-slate-500">Tap, click, or press Space to flap. The server owns physics, pipes, score, and collisions.</p>
    </div>
  );
}
