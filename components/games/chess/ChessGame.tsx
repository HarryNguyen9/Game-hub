"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Flag } from "lucide-react";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { GameResultDialog } from "@/components/games/game-result-dialog";
import { GameMuteButton, useGameAudio } from "@/components/games/use-game-audio";
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

function ChessPlayerCard({
  player,
  isCurrentUser,
  isTurn,
  moveCount
}: {
  player: ChessSnapshot["players"][string] | null | undefined;
  isCurrentUser: boolean;
  isTurn: boolean;
  moveCount: number;
}) {
  if (!player) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm shadow-sm ring-1 ${
        isCurrentUser
          ? "bg-indigo-50 text-indigo-700 ring-indigo-100"
          : "bg-white text-slate-700 ring-slate-100"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate font-black">{player.displayName}</p>
        <p className="text-xs font-bold opacity-70">
          {sideLabel(player.color)} · {moveCount} moves
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
          isTurn ? "bg-[#ff7a90] text-white shadow-sm" : "bg-slate-100 text-slate-500"
        }`}
      >
        {isTurn ? "Turn" : sideLabel(player.color)}
      </span>
    </div>
  );
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
  const previousStatusRef = useRef<string | null>(initialSnapshot?.status ?? null);
  const previousMoveCountRef = useRef(initialSnapshot?.moveHistory.length ?? 0);
  const { muted, setMuted, playTone } = useGameAudio("chess-muted");
  const now = useNow();

  const currentPlayer = snapshot?.players[currentUserId];
  const currentTurnPlayer = snapshot?.currentTurnUserId ? snapshot.players[snapshot.currentTurnUserId] : null;
  const isMyTurn = snapshot?.status === "playing" && snapshot.currentTurnUserId === currentUserId;
  const currentFen = snapshot?.fen;

  const legalMoveSquares = useMemo<Set<string>>(() => {
    if (!selectedSquare || !currentFen || !isMyTurn) return new Set();
    try {
      const chess = new Chess(currentFen);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const moves = chess.moves({ square: selectedSquare as any, verbose: true }) as Array<{ to: string }>;
      return new Set(moves.map((m) => m.to));
    } catch {
      return new Set();
    }
  }, [selectedSquare, currentFen, isMyTurn]);
  const remainingMs = snapshot ? (now ? Math.max(0, snapshot.turnEndsAt - now) : snapshot.turnDurationSeconds * 1000) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const timerPercent = snapshot ? Math.max(0, Math.min(100, (remainingMs / (snapshot.turnDurationSeconds * 1000)) * 100)) : 0;
  const lastMove = snapshot?.moveHistory.at(-1) || null;

  useEffect(() => {
    if (!snapshot) return;
    const previousTurn = lastTurnRef.current;
    lastTurnRef.current = snapshot.currentTurnUserId;
    if (snapshot.status !== "playing" || snapshot.currentTurnUserId !== currentUserId || previousTurn === currentUserId) return;
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
    if (snapshot.moveHistory.length > previousMoveCountRef.current) playTone("move");
    previousMoveCountRef.current = snapshot.moveHistory.length;
    if (previousStatusRef.current !== "ended" && snapshot.status === "ended") playTone("end");
    previousStatusRef.current = snapshot.status;
  }, [playTone, snapshot]);

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
      <div className="flex items-center gap-2">
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {connected ? "Connected" : "Reconnecting"}
        </span>
        <GameMuteButton muted={muted} onToggle={() => setMuted((value) => !value)} label="Chess" />
      </div>
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
  const currentMoveCount = snapshot.moveHistory.filter((record) => record.userId === currentUserId).length;
  const opponentMoveCount = opponent ? snapshot.moveHistory.filter((record) => record.userId === opponent.userId).length : 0;

  return (
    <GameFullscreenShell expanded={expanded} onToggleExpanded={onToggleExpanded} header={header}>
      <ToastPopup message={error} />
      <GameResultDialog
        open={snapshot.status === "ended"}
        title={reasonLabel(snapshot.endReason)}
        subtitle={winner ? `Winner: ${winner.displayName}` : "Draw game"}
        isHost={isHost}
        returning={returning}
        onBackToLobby={() => {
          setReturning(true);
          backToLobby();
        }}
        tone="indigo"
      />
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
          <div className="mb-3 grid gap-2">
            <ChessPlayerCard
              player={opponent}
              isCurrentUser={false}
              isTurn={snapshot.currentTurnUserId === opponent?.userId}
              moveCount={opponentMoveCount}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-xs font-bold text-slate-400">Promotion defaults to Queen in this MVP.</p>
              {snapshot.check && snapshot.status === "playing" && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-600">Check</span>}
            </div>
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
          <div className="mt-3">
            <ChessPlayerCard
              player={currentPlayer}
              isCurrentUser
              isTurn={snapshot.currentTurnUserId === currentUserId}
              moveCount={currentMoveCount}
            />
          </div>
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
          <p className="text-xs font-bold text-slate-400">Client only sends from/to. Server validates all chess rules.</p>
        </aside>
      </div>
      <p className="text-center text-sm font-semibold text-slate-500">Tap a piece, then tap its destination. Each turn has 30 seconds.</p>
    </GameFullscreenShell>
  );
}
