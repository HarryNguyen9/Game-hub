"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Maximize2, Minimize2, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlappySnapshot } from "@/lib/games/flappy-duel/types";
import { renderFlappyDuel } from "./renderFlappyDuel";
import { useFlappyDuelSocket } from "./useFlappyDuelSocket";

export function FlappyDuelGame({
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
  initialSnapshot?: FlappySnapshot | null;
  roomStatus: "playing" | "ended";
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousSnapshotRef = useRef<FlappySnapshot | null>(null);
  const snapshotRef = useRef<FlappySnapshot | null>(null);
  const snapshotReceivedAtRef = useRef(0);
  const predictedSelfYRef = useRef<number | null>(null);
  const lastCrashAtRef = useRef<number | null>(null);
  const lastPointerFlapAtRef = useRef(0);
  const roomEnded = roomStatus === "ended";
  const { snapshot, countdown, error, connected, flap, backToLobby, lastFlapAtRef } = useFlappyDuelSocket(roomId, currentUserId, onGameEnd, initialSnapshot, roomEnded);
  const [returning, setReturning] = useState(false);
  const currentPlayer = snapshot?.players[currentUserId];
  const ended = snapshot?.status === "ended";

  useEffect(() => {
    previousSnapshotRef.current = snapshotRef.current;
    snapshotRef.current = snapshot;
    snapshotReceivedAtRef.current = performance.now();
    const self = snapshot?.players[currentUserId];
    if (self) predictedSelfYRef.current = self.y;
  }, [currentUserId, snapshot]);

  useEffect(() => {
    if (!snapshot || currentPlayer?.alive !== false || ended) return;
    if (!lastCrashAtRef.current) lastCrashAtRef.current = performance.now();
  }, [currentPlayer?.alive, ended, snapshot]);

  useEffect(() => {
    let frame = 0;
    function draw() {
      const snapshotValue = snapshotRef.current;
      const canvas = canvasRef.current;
      if (snapshotValue && canvas) {
        const context = canvas.getContext("2d");
        if (context) {
          canvas.width = snapshotValue.config.worldWidth;
          canvas.height = snapshotValue.config.worldHeight;
          const elapsed = performance.now() - snapshotReceivedAtRef.current;
          const interpolation = Math.max(0, Math.min(1, elapsed / 50));
          const self = snapshotValue.players[currentUserId];
          if (self && predictedSelfYRef.current !== null) {
            const target = self.alive && snapshotValue.status === "playing" ? predictedSelfYRef.current + self.velocity * 0.18 : self.y;
            predictedSelfYRef.current += (target - predictedSelfYRef.current) * 0.18;
          }
          renderFlappyDuel(context, {
            previousSnapshot: previousSnapshotRef.current,
            currentSnapshot: snapshotValue,
            currentUserId,
            interpolation,
            predictedSelfY: predictedSelfYRef.current,
            lastFlapAt: lastFlapAtRef.current,
            lastCrashAt: lastCrashAtRef.current
          });
        }
      }
      frame = window.requestAnimationFrame(draw);
    }

    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [currentUserId, lastFlapAtRef]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" || event.repeat) return;
      event.preventDefault();
      flap();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flap]);

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const now = performance.now();
    if (now - lastPointerFlapAtRef.current < 70) return;
    lastPointerFlapAtRef.current = now;
    flap();
  }

  const connectionLabel = connected ? "Connected" : "Reconnecting";
  const leaderboard = snapshot?.leaderboard || [];

  return (
    <div className={expanded ? "fixed inset-0 z-50 flex h-dvh flex-col gap-3 overflow-y-auto bg-white p-3" : "relative mt-4 grid gap-4"}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-slate-50 px-4 py-3">
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {connectionLabel}
        </span>
        <div className="min-w-0 overflow-hidden">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {leaderboard.map((player) => (
              <span
                key={player.userId}
                className={`flex min-w-0 max-w-[9.5rem] shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm sm:max-w-[11rem] ${
                  player.alive ? "text-slate-700" : "text-slate-400"
                }`}
              >
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-rose-100 text-[10px] text-rose-600">{player.displayName.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 truncate">{player.displayName}</span>
                <span className="shrink-0">{player.score}</span>
                <span className={`size-2 shrink-0 rounded-full ${player.alive ? "bg-emerald-400" : "bg-slate-300"}`} />
              </span>
            ))}
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/92 p-0 shadow-sm"
          onClick={onToggleExpanded}
          aria-label={expanded ? "Exit full screen" : "Open full screen"}
          title={expanded ? "Small" : "Full"}
        >
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </Button>
      </div>
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
      <div
        className={
          expanded
            ? "relative grid min-h-[68dvh] flex-1 place-items-center overflow-hidden rounded-[1.5rem] bg-sky-100 shadow-inner max-[700px]:min-h-[74dvh] max-[700px]:landscape:min-h-[66dvh]"
            : "relative grid min-h-[24rem] place-items-center overflow-hidden rounded-[1.5rem] bg-sky-100 shadow-inner sm:min-h-[28rem] lg:min-h-0 lg:aspect-[900/520]"
        }
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          className={expanded ? "block h-auto max-h-full w-full select-none touch-none object-contain" : "absolute inset-0 block h-full w-full select-none touch-none object-contain"}
          aria-label="Flappy Duel game canvas"
        />
        {countdown && (
          <div className="absolute inset-0 grid place-items-center bg-white/35">
            <div className="rounded-[2rem] bg-white/85 px-10 py-7 text-center shadow-xl">
              <p className="text-sm font-black uppercase text-rose-400">Get ready</p>
              <p className="text-7xl font-black text-[#ff6f91]">{countdown}</p>
            </div>
          </div>
        )}
        {!snapshot && !countdown && !roomEnded && <div className="absolute inset-0 grid place-items-center font-black text-slate-600">Waiting for game snapshot...</div>}
        {!snapshot && roomEnded && (
          <div className="absolute inset-0 grid place-items-center bg-white/82 p-4">
            <div className="w-full max-w-sm rounded-[2rem] bg-white p-5 text-center shadow-xl">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-amber-100 text-amber-600">
                <Trophy size={24} />
              </div>
              <p className="mt-2 text-2xl font-black">Round ended</p>
              <p className="mt-1 text-sm font-bold text-slate-500">Waiting for the host to return everyone to the lobby.</p>
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
        {currentPlayer && !currentPlayer.alive && !ended && (
          <div className="absolute left-4 top-4 max-w-[15rem] rounded-2xl bg-white/92 px-4 py-3 text-sm shadow-lg">
            <p className="font-black text-red-500">You crashed!</p>
            <p className="mt-1 font-bold text-slate-500">Spectating the rest of the round.</p>
          </div>
        )}
        {ended && snapshot && (
          <div className="absolute inset-0 grid place-items-center bg-white/82 p-4">
            <div className="w-full max-w-sm rounded-[2rem] bg-white p-5 text-center shadow-xl">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-amber-100 text-amber-600">
                <Trophy size={24} />
              </div>
              <p className="mt-2 text-2xl font-black">Round ended</p>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Winner: {snapshot.leaderboard[0]?.displayName || "Nobody"}
              </p>
              <div className="mt-4 grid gap-2 text-left">
                {snapshot.leaderboard.map((player, index) => (
                  <div key={player.userId} className={`flex items-center justify-between rounded-2xl px-4 py-2 text-sm font-black ${index === 0 ? "bg-amber-50 text-amber-700" : "bg-slate-50"}`}>
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
              {!isHost && <p className="mt-4 text-sm font-bold text-slate-500">Waiting for host to return to lobby.</p>}
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-sm font-semibold text-slate-500">Tap / click / Space to flap. Server owns score, death, and pipes.</p>
    </div>
  );
}
