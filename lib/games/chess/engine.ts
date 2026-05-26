import { Chess } from "chess.js";
import { createTurnWindow } from "@/lib/games/turn-based";
import type { ChessColor, ChessState } from "./types";

type PlayerInput = {
  userId: string;
  username: string;
  displayName: string;
};

function colorTurn(color: ChessColor) {
  return color === "white" ? "w" : "b";
}

function setTurn(state: ChessState, userId: string | null) {
  state.currentTurnUserId = userId;
  const turn = createTurnWindow();
  state.turnStartedAt = turn.turnStartedAt;
  state.turnEndsAt = turn.turnEndsAt;
  state.turnDurationSeconds = turn.turnDurationSeconds;
}

function userForTurn(state: ChessState, turn: "w" | "b") {
  return Object.values(state.players).find((player) => colorTurn(player.color) === turn)?.userId || null;
}

function opponentOf(state: ChessState, userId: string) {
  return Object.keys(state.players).find((candidate) => candidate !== userId) || null;
}

function syncStatus(state: ChessState, chess: Chess) {
  state.fen = chess.fen();
  state.pgn = chess.pgn();
  state.turn = chess.turn();
  state.check = chess.isCheck();
  state.checkmate = chess.isCheckmate();
  state.draw = chess.isDraw() || chess.isStalemate();
}

function endGame(state: ChessState, winnerUserId: string | null, reason: ChessState["endReason"]) {
  state.status = "ended";
  state.currentTurnUserId = null;
  state.winnerUserId = winnerUserId;
  state.endReason = reason;
  state.updatedAt = Date.now();
}

export function createChessState(sessionId: string, roomId: string, players: PlayerInput[]): ChessState {
  const [first, second] = players.slice(0, 2);
  const firstIsWhite = Math.random() > 0.5;
  const white = firstIsWhite ? first : second;
  const black = firstIsWhite ? second : first;
  const chess = new Chess();
  const turn = createTurnWindow();

  return {
    sessionId,
    roomId,
    gameKey: "chess",
    status: "playing",
    fen: chess.fen(),
    pgn: chess.pgn(),
    turn: chess.turn(),
    currentTurnUserId: white.userId,
    ...turn,
    players: {
      [white.userId]: { ...white, color: "white", connected: true },
      [black.userId]: { ...black, color: "black", connected: true }
    },
    moveHistory: [],
    check: chess.isCheck(),
    checkmate: chess.isCheckmate(),
    draw: chess.isDraw(),
    winnerUserId: null,
    endReason: null,
    startedAt: Date.now(),
    updatedAt: Date.now()
  };
}

export function applyChessMove(state: ChessState, userId: string, from: string, to: string, promotion = "q") {
  if (state.status !== "playing") return "Game already ended.";
  if (state.currentTurnUserId !== userId) return "It is not your turn.";
  if (Date.now() > state.turnEndsAt) return "Your turn timed out.";
  const player = state.players[userId];
  if (!player) return "You are not an active player.";
  if (colorTurn(player.color) !== state.turn) return "It is not your color's turn.";
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return "Invalid chess square.";
  if (!["q", "r", "b", "n"].includes(promotion)) return "Invalid promotion piece.";

  const chess = new Chess(state.fen);
  let move;
  try {
    move = chess.move({ from, to, promotion });
  } catch {
    return "Illegal chess move.";
  }
  if (!move) return "Illegal chess move.";

  state.moveHistory.push({ from: move.from, to: move.to, san: move.san, color: move.color, userId, createdAt: Date.now() });
  syncStatus(state, chess);
  if (state.checkmate) {
    endGame(state, userId, "checkmate");
  } else if (state.draw) {
    endGame(state, null, "draw");
  } else {
    setTurn(state, userForTurn(state, state.turn));
    state.updatedAt = Date.now();
  }
  return null;
}

export function timeoutChessTurn(state: ChessState) {
  if (state.status !== "playing" || !state.currentTurnUserId) return false;
  const loser = state.currentTurnUserId;
  endGame(state, opponentOf(state, loser), "timeout");
  return true;
}

export function resignChess(state: ChessState, userId: string) {
  if (state.status !== "playing") return "Game already ended.";
  if (!state.players[userId]) return "You are not an active player.";
  endGame(state, opponentOf(state, userId), "resign");
  return null;
}
