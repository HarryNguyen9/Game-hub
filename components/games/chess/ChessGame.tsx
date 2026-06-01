"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Flag, RotateCcw, Trophy } from "lucide-react";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { Button } from "@/components/ui/button";
import { ToastPopup } from "@/components/ui/toast-popup";
import type { ChessSnapshot } from "@/lib/games/chess/types";
import { ChessBoard, type BoardPiece } from "./ChessBoard";
import { useChessSocket } from "./useChessSocket";

function useNow(step = 250) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), step);
    return () => window.clearInterval(timer);
  }, [step]);
  return now;
}

function sideLabel(color?: "white" | "black") {
  return color === "white" ? "White" : color === "black" ? "Black" : "Player";
}

function reasonLabel(reason: ChessSnapshot["endReason"]) {
  if (reason === "checkmate") return "Checkmate";
  if (reason === "timeout") return "Timeout";
  if (reason === "resign") return "Resigned";
  if (reason === "draw") return "Draw";
  return "Game ended";
}

export function ChessGame({
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
  initialSnapshot?: ChessSnapshot | null;
  roomStatus: "playing" | "ended";
}) {
  const { snapshot, error, connected, move, resign, backToLobby } = useChessSocket(roomId, onGameEnd, initialSnapshot, roomStatus === "ended");
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [turnNotice, setTurnNotice] = useState(false);
  const lastTurnRef = useRef<string | null>(initialSnapshot?.currentTurnUserId ?? null);
  const now = useNow();

  const currentPlayer = snapshot?.players[currentUserId];
  const currentTurnPlayer = snapshot?.currentTurnUserId ? snapshot.players[snapshot.currentTurnUserId] : null;
  const isMyTurn = snapshot?.status === "playing" && snapshot.currentTurnUserId === currentUserId;

  const legalMoveSquares = useMemo<Set<string>>(() => {
    if (!selectedSquare || !snapshot || !isMyTurn) return new Set();
    try {
      const chess = new Chess(snapshot.fen);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const moves = chess.moves({ square: selectedSquare as any, verbose: true }) as Array<{ to: string }>;
      return new Set(moves.map((m) => m.to));
    } catch {
      return new Set();
    }
  }, [selectedSquare, snapshot?.fen, isMyTurn]);
  const remainingMs = snapshot ? (now ? Math.max(0, snapshot.turnEndsAt - now) : snapshot.turnDurationSeconds * 1000) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const timerPercent = snapshot ? Math.max(0, Math.min(100, (remainingMs / (snapshot.turnDurationSeconds * 1000)) * 100)) : 0;
  const lastMove = snapshot?.moveHistory.at(-1) || null;

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

  function handleSquareClick(square: string, piece: BoardPiece | null) {
    if (!snapshot || !currentPlayer || !isMyTurn) return;
    const ownColor = currentPlayer.color === "white" ? "w" : "b";
    const isOwnPiece = piece?.color === ownColor;
    if (!selectedSquare) {
      if (isOwnPiece) setSelectedSquare(square);
      return;
    }
    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }
    if (isOwnPiece) {
      setSelectedSquare(square);
      return;
    }
    move(snapshot.sessionId, selectedSquare, square, "q");
    setSelectedSquare(null);
  }

  const header = (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
        {connected ? "Connected" : "Reconnecting"}
      </span>
      {snapshot && (
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black text-slate-500">
            <span>{snapshot.status === "ended" ? reasonLabel(snapshot.endReason) : isMyTurn ? "Your turn" : `${currentTurnPlayer?.displayName || "Opponent"}'s turn`}</span>
            {snapshot.status === "playing" && <span className={remainingSeconds <= 5 ? "text-red-500" : "text-slate-600"}>{remainingSeconds}s</span>}
          </div>
          {snapshot.status === "playing" && (
            <div className="h-2 overflow-hidden rounded-full bg-white">
              <div className={`h-full rounded-full ${remainingSeconds <= 5 ? "bg-red-400" : "bg-[#ff7a90]"}`} style={{ width: `${timerPercent}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (!snapshot) {
    return (
      <GameFullscreenShell expanded={expanded} onToggleExpanded={onToggleExpanded} header={header}>
        <div className="grid min-h-[22rem] place-items-center rounded-[1.5rem] bg-indigo-50 font-black text-slate-600">
          {connected ? "Loading Chess..." : "Connecting to Chess..."}
        </div>
      </GameFullscreenShell>
    );
  }

  const winner = snapshot.winnerUserId ? snapshot.players[snapshot.winnerUserId] : null;
  const opponent = Object.values(snapshot.players).find((player) => player.userId !== currentUserId);

  return (
    <GameFullscreenShell expanded={expanded} onToggleExpanded={onToggleExpanded} header={header}>
      <ToastPopup message={error} />
      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {turnNotice && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
            <div className="animate-[chess-turn_1600ms_ease-out_forwards] rounded-full bg-[#ff7a90] px-5 py-3 text-sm font-black text-white shadow-xl">
              Your turn
            </div>
          </div>
        )}
        <style>{`
          @keyframes chess-turn {
            0% { opacity: 0; transform: translateY(12px) scale(0.92); }
            18% { opacity: 1; transform: translateY(0) scale(1); }
            82% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-10px) scale(0.96); }
          }
        `}</style>
        <div className="rounded-[1.6rem] bg-gradient-to-br from-indigo-50 via-white to-amber-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black text-slate-500">You are {sideLabel(currentPlayer?.color)}</p>
              <p className="text-xs font-bold text-slate-400">Promotion defaults to Queen in this MVP.</p>
            </div>
            {snapshot.check && snapshot.status === "playing" && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-600">Check</span>}
          </div>
          <ChessBoard
            fen={snapshot.fen}
            orientation={currentPlayer?.color || "white"}
            selectedSquare={selectedSquare}
            lastMove={lastMove}
            hintSquares={legalMoveSquares}
            canInteract={snapshot.status === "playing" && isMyTurn}
            onSquareClick={handleSquareClick}
          />
          {snapshot.status === "ended" && (
            <div className="mx-auto mt-4 max-w-md rounded-[1.5rem] bg-white/95 p-5 text-center shadow-xl">
              <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-amber-100 text-amber-600">
                <Trophy size={22} />
              </div>
              <p className="text-2xl font-black">{reasonLabel(snapshot.endReason)}</p>
              <p className="mt-1 text-sm font-black text-slate-500">{winner ? `Winner: ${winner.displayName}` : "Draw game"}</p>
              {isHost ? (
                <Button
                  className="mt-4 w-full justify-center"
                  disabled={returning}
                  onClick={() => {
                    setReturning(true);
                    backToLobby();
                  }}
                >
                  <RotateCcw size={18} /> {returning ? "Returning..." : "Back to Lobby"}
                </Button>
              ) : (
                <p className="mt-4 text-sm font-black text-slate-500">Waiting for host to return to lobby.</p>
              )}
            </div>
          )}
        </div>
        <aside className="grid content-start gap-3 rounded-[1.6rem] bg-slate-50 p-4">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">Players</p>
            <div className="mt-2 grid gap-2">
              {Object.values(snapshot.players).map((player) => (
                <div key={player.userId} className={`rounded-2xl px-3 py-2 text-sm font-black ${player.userId === snapshot.currentTurnUserId ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-700"}`}>
                  {player.displayName} · {sideLabel(player.color)}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <p className="text-xs font-black uppercase text-slate-400">Move history</p>
            <div className="mt-2 max-h-56 overflow-y-auto text-sm font-bold text-slate-600">
              {snapshot.moveHistory.length === 0 ? (
                <p className="text-slate-400">No moves yet.</p>
              ) : (
                snapshot.moveHistory.map((record, index) => (
                  <p key={`${record.createdAt}-${record.from}-${record.to}`} className="py-1">
                    {index + 1}. {record.san}
                  </p>
                ))
              )}
            </div>
          </div>
          {snapshot.status === "playing" && (
            <Button variant="secondary" disabled={!currentPlayer} onClick={() => resign(snapshot.sessionId)}>
              <Flag size={18} /> Resign
            </Button>
          )}
          {opponent && <p className="text-xs font-bold text-slate-400">Opponent: {opponent.displayName}</p>}
          <p className="text-xs font-bold text-slate-400">Client only sends from/to. Server validates all chess rules.</p>
        </aside>
      </div>
      <p className="text-center text-sm font-semibold text-slate-500">Tap a piece, then tap its destination. Each turn has 30 seconds.</p>
    </GameFullscreenShell>
  );
}
