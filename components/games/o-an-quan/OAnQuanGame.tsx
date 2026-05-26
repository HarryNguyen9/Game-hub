"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { Button } from "@/components/ui/button";
import type { OAnQuanDirection, OAnQuanMove, OAnQuanPit, OAnQuanSnapshot } from "@/lib/games/o-an-quan/types";
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

function cloneBoard(board: OAnQuanPit[]) {
  return board.map((pit) => ({ ...pit }));
}

function nextIndex(index: number, direction: OAnQuanDirection) {
  return direction === "clockwise" ? (index + 1) % 12 : (index + 11) % 12;
}

function pitHasStones(pit: OAnQuanPit) {
  return pit.smallStones > 0 || pit.bigStones > 0;
}

function pitTotal(pit: OAnQuanPit) {
  return pit.smallStones + pit.bigStones * 10;
}

function buildMoveFrames(board: OAnQuanPit[], move: OAnQuanMove) {
  if (move.reason !== "move" || move.selectedPitIndex === null || !move.direction) return [];
  const frames: OAnQuanPit[][] = [];
  const working = cloneBoard(board);
  const selected = working[move.selectedPitIndex];
  let stones = selected.smallStones;
  if (stones <= 0) return [];
  selected.smallStones = 0;
  frames.push(cloneBoard(working));
  let current = move.selectedPitIndex;
  let guard = 0;

  while (stones > 0 && guard < 120) {
    guard += 1;
    current = nextIndex(current, move.direction);
    working[current].smallStones += 1;
    stones -= 1;
    frames.push(cloneBoard(working));
    if (stones > 0) continue;

    const next = nextIndex(current, move.direction);
    const nextPit = working[next];
    if (nextPit.type === "dan" && pitHasStones(nextPit)) {
      stones = nextPit.smallStones;
      nextPit.smallStones = 0;
      current = next;
      frames.push(cloneBoard(working));
      continue;
    }

    if (!pitHasStones(nextPit)) {
      let emptyIndex = next;
      let captureIndex = nextIndex(emptyIndex, move.direction);
      while (!pitHasStones(working[emptyIndex]) && pitHasStones(working[captureIndex]) && guard < 120) {
        guard += 1;
        working[captureIndex].smallStones = 0;
        working[captureIndex].bigStones = 0;
        frames.push(cloneBoard(working));
        emptyIndex = nextIndex(captureIndex, move.direction);
        captureIndex = nextIndex(emptyIndex, move.direction);
      }
    }
  }

  return frames;
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
  const [displayBoard, setDisplayBoard] = useState<OAnQuanPit[] | null>(initialSnapshot ? cloneBoard(initialSnapshot.board) : null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [popupPitIndex, setPopupPitIndex] = useState<number | null>(null);
  const [popupNonce, setPopupNonce] = useState(0);
  const [capturePopup, setCapturePopup] = useState<string | null>(null);
  const [turnNotice, setTurnNotice] = useState(false);
  const lastAnimatedMoveRef = useRef<number | null>(null);
  const lastTurnRef = useRef<string | null>(initialSnapshot?.currentTurnUserId ?? null);
  const previousBoardRef = useRef<OAnQuanPit[] | null>(initialSnapshot ? cloneBoard(initialSnapshot.board) : null);
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
    setIsAnimating(true);
    move(snapshot.sessionId, selectedPit, direction);
    setSelectedPit(null);
  }

  useEffect(() => {
    if (!snapshot) return;
    const lastMove = snapshot.lastMove;
    const moveId = lastMove?.createdAt || 0;
    const currentBoard = previousBoardRef.current || cloneBoard(snapshot.board);
    const shouldAnimate = lastMove?.reason === "move" && lastAnimatedMoveRef.current !== moveId && snapshot.status === "playing";
    if (!shouldAnimate) {
      previousBoardRef.current = cloneBoard(snapshot.board);
      return;
    }

    const frames = lastMove ? buildMoveFrames(currentBoard, lastMove) : [];
    if (!frames.length) {
      previousBoardRef.current = cloneBoard(snapshot.board);
      lastAnimatedMoveRef.current = moveId;
      return;
    }

    let index = 0;
    let previousFrame = currentBoard;
    lastAnimatedMoveRef.current = moveId;
    previousBoardRef.current = cloneBoard(snapshot.board);
    const startTimer = window.setTimeout(() => setIsAnimating(true), 0);
    let captureTimer: number | null = null;
    let clearCaptureTimer: number | null = null;
    if (lastMove?.captured && lastMove.captured > 0) {
      captureTimer = window.setTimeout(() => setCapturePopup(`+${lastMove.captured} pts`), 500);
      clearCaptureTimer = window.setTimeout(() => setCapturePopup(null), 1800);
    }
    const timer = window.setInterval(() => {
      const nextFrame = index < frames.length ? frames[index] : null;
      if (nextFrame) {
        const changedPit = nextFrame.find((pit, pitIndex) => pitTotal(pit) > pitTotal(previousFrame[pitIndex]));
        if (changedPit) {
          setPopupPitIndex(changedPit.index);
          setPopupNonce((value) => value + 1);
        }
        previousFrame = nextFrame;
      }
      setDisplayBoard(nextFrame);
      index += 1;
      if (index > frames.length) {
        setIsAnimating(false);
        setPopupPitIndex(null);
        window.clearInterval(timer);
      }
    }, 280);
    return () => {
      window.clearTimeout(startTimer);
      if (captureTimer) window.clearTimeout(captureTimer);
      if (clearCaptureTimer) window.clearTimeout(clearCaptureTimer);
      window.clearInterval(timer);
    };
  }, [snapshot?.lastMove?.createdAt, snapshot?.status, snapshot]);

  useEffect(() => {
    if (!snapshot) return;
    const previousTurn = lastTurnRef.current;
    lastTurnRef.current = snapshot.currentTurnUserId;
    if (snapshot.status !== "playing" || snapshot.currentTurnUserId !== currentUserId || previousTurn === currentUserId) return;
    const showTimer = window.setTimeout(() => setTurnNotice(true), 0);
    const hideTimer = window.setTimeout(() => setTurnNotice(false), 1700);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [currentUserId, snapshot?.currentTurnUserId, snapshot?.status, snapshot]);

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
        {turnNotice && (
          <div className="pointer-events-none fixed left-1/2 top-24 z-50 -translate-x-1/2 animate-[oaq-turn_1600ms_ease-out_forwards] rounded-full bg-[#ff7a90] px-5 py-3 text-sm font-black text-white shadow-xl">
            Your turn
          </div>
        )}
        <style>{`
          @keyframes oaq-turn {
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
        <div className="grid gap-2 sm:grid-cols-2">
          {scores.map((player) => (
            <div key={player.userId} className={`rounded-2xl px-4 py-3 text-sm font-black shadow-sm ${player.userId === currentUserId ? "bg-rose-50 text-rose-700" : "bg-white text-slate-700"}`}>
              {player.displayName} · {player.side} · {player.score} pts
            </div>
          ))}
        </div>
        <OAnQuanBoard
          board={displayBoard || snapshot.board}
          mySide={currentPlayer?.side || "bottom"}
          canMove={isMyTurn && !isAnimating}
          selectedPit={selectedPit}
          popupPitIndex={popupPitIndex}
          popupNonce={popupNonce}
          capturePopup={capturePopup}
          onSelectPit={setSelectedPit}
          onMove={submit}
        />
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
