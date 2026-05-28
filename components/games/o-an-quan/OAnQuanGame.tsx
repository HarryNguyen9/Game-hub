"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { Button } from "@/components/ui/button";
import { OAQ_CONFIG } from "@/lib/games/o-an-quan/config";
import type { OAnQuanDirection, OAnQuanMove, OAnQuanPit, OAnQuanPlayer, OAnQuanSnapshot } from "@/lib/games/o-an-quan/types";
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
  const [displayPlayers, setDisplayPlayers] = useState<Record<string, OAnQuanPlayer>>(initialSnapshot?.players ?? {});
  const [isAnimating, setIsAnimating] = useState(false);
  const [popupPitIndex, setPopupPitIndex] = useState<number | null>(null);
  const [popupNonce, setPopupNonce] = useState(0);
  const [capturePopup, setCapturePopup] = useState<string | null>(null);
  const [turnNotice, setTurnNotice] = useState(false);
  const lastAnimatedMoveRef = useRef<number | null>(initialSnapshot?.lastMove?.createdAt ?? null);
  const lastTurnRef = useRef<string | null>(initialSnapshot?.currentTurnUserId ?? null);
  const previousBoardRef = useRef<OAnQuanPit[] | null>(initialSnapshot ? cloneBoard(initialSnapshot.board) : null);
  const snapshotRef = useRef<OAnQuanSnapshot | null>(initialSnapshot ?? null);
  const [turnReady, setTurnReady] = useState(() => {
    if (!initialSnapshot) return false;
    return initialSnapshot.turnStartedAt <= initialSnapshot.serverTime;
  });
  const now = useNow();
  const currentPlayer = snapshot?.players[currentUserId];
  const currentTurnPlayer = snapshot?.currentTurnUserId ? snapshot.players[snapshot.currentTurnUserId] : null;
  const turnActive = turnReady;
  const isMyTurn = snapshot?.status === "playing" && snapshot.currentTurnUserId === currentUserId && turnActive && !isAnimating;
  const resolvingMove = Boolean(snapshot && snapshot.status === "playing" && (!turnActive || isAnimating));
  const remainingMs = snapshot
    ? resolvingMove
      ? snapshot.turnDurationSeconds * 1000
      : now
        ? Math.max(0, snapshot.turnEndsAt - now)
        : snapshot.turnDurationSeconds * 1000
    : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const timerPercent = snapshot ? Math.max(0, Math.min(100, (remainingMs / (snapshot.turnDurationSeconds * 1000)) * 100)) : 0;
  const scores = useMemo(() => Object.values(displayPlayers).sort((a) => (a.side === "top" ? -1 : 1)), [displayPlayers]);
  const moveId = snapshot?.lastMove?.createdAt || 0;

  function submit(direction: OAnQuanDirection) {
    if (!snapshot || selectedPit === null || !isMyTurn || isAnimating) return;
    move(snapshot.sessionId, selectedPit, direction);
    setSelectedPit(null);
  }

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    setSelectedPit(null);
  }, [snapshot?.currentTurnUserId]);

  useEffect(() => {
    if (!snapshot) return;
    const delay = snapshot.turnStartedAt - snapshot.serverTime;
    if (delay <= 0) {
      setTurnReady(true);
      return;
    }
    setTurnReady(false);
    const timer = window.setTimeout(() => setTurnReady(true), delay);
    return () => window.clearTimeout(timer);
  }, [snapshot?.turnStartedAt]);

  useEffect(() => {
    if (!snapshot || isAnimating) return;
    const lastMove = snapshot.lastMove;
    const currentMoveId = lastMove?.createdAt || 0;
    if (lastMove?.reason === "move" && lastAnimatedMoveRef.current !== currentMoveId && snapshot.status === "playing") return;
    previousBoardRef.current = cloneBoard(snapshot.board);
    setDisplayBoard(cloneBoard(snapshot.board));
    setDisplayPlayers(snapshot.players);
  }, [isAnimating, snapshot]);

  useEffect(() => {
    const activeSnapshot = snapshotRef.current;
    if (!activeSnapshot) return;
    const lastMove = activeSnapshot.lastMove;
    const currentBoard = previousBoardRef.current || cloneBoard(activeSnapshot.board);
    const shouldAnimate = lastMove?.reason === "move" && lastAnimatedMoveRef.current !== moveId && activeSnapshot.status === "playing";
    if (!shouldAnimate) {
      return;
    }

    const frames = lastMove ? buildMoveFrames(currentBoard, lastMove) : [];
    if (!frames.length) {
      previousBoardRef.current = cloneBoard(activeSnapshot.board);
      lastAnimatedMoveRef.current = moveId;
      setDisplayBoard(cloneBoard(activeSnapshot.board));
      setDisplayPlayers(activeSnapshot.players);
      setIsAnimating(false);
      return;
    }

    let index = 1;
    let previousFrame = frames[0];
    lastAnimatedMoveRef.current = moveId;
    previousBoardRef.current = cloneBoard(activeSnapshot.board);
    setIsAnimating(true);
    setDisplayBoard(frames[0]);
    let captureTimer: number | null = null;
    let clearCaptureTimer: number | null = null;
    if (lastMove?.captured && lastMove.captured > 0) {
      const captureDelay = Math.max(0, (frames.length - 1) * OAQ_CONFIG.moveAnimationFrameMs - OAQ_CONFIG.moveAnimationFrameMs);
      captureTimer = window.setTimeout(() => setCapturePopup(`+${lastMove.captured} pts`), captureDelay);
      clearCaptureTimer = window.setTimeout(() => setCapturePopup(null), captureDelay + 1700);
    }
    const timer = window.setInterval(() => {
      const nextFrame = frames[index] || frames[frames.length - 1];
      const changedPit = nextFrame.find((pit, pitIndex) => pitTotal(pit) > pitTotal(previousFrame[pitIndex]));
      if (changedPit) {
        setPopupPitIndex(changedPit.index);
        setPopupNonce((value) => value + 1);
      }
      previousFrame = nextFrame;
      setDisplayBoard(nextFrame);
      if (index >= frames.length - 1) {
        setIsAnimating(false);
        setPopupPitIndex(null);
        setDisplayBoard(cloneBoard(activeSnapshot.board));
        setDisplayPlayers(activeSnapshot.players);
        window.clearInterval(timer);
      }
      index += 1;
    }, OAQ_CONFIG.moveAnimationFrameMs);
    return () => {
      if (captureTimer) window.clearTimeout(captureTimer);
      if (clearCaptureTimer) window.clearTimeout(clearCaptureTimer);
      window.clearInterval(timer);
    };
  }, [moveId]);

  useEffect(() => {
    if (!snapshot) return;
    const previousTurn = lastTurnRef.current;
    lastTurnRef.current = snapshot.currentTurnUserId;
    if (snapshot.status !== "playing" || snapshot.currentTurnUserId !== currentUserId || previousTurn === currentUserId) return;
    const delay = Math.max(0, snapshot.turnStartedAt - snapshot.serverTime);
    const showTimer = window.setTimeout(() => setTurnNotice(true), delay);
    const hideTimer = window.setTimeout(() => setTurnNotice(false), delay + 1700);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [currentUserId, snapshot?.currentTurnUserId, snapshot?.status]);

  const header = (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{connected ? "Connected" : "Reconnecting"}</span>
      {snapshot && (
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black text-slate-500">
            <span>{resolvingMove ? "Moving stones" : isMyTurn ? "Your turn" : `${currentTurnPlayer?.displayName || "Opponent"}'s turn`}</span>
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
        <div className="relative">
          {turnNotice && !isAnimating && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-30 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 animate-[oaq-turn_1600ms_ease-out_forwards] rounded-full bg-[#ff7a90] px-5 py-3 text-sm font-black text-white shadow-xl sm:top-5">
              Your turn
            </div>
          )}
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
        </div>
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
