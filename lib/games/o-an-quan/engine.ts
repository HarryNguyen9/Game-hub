import { createTurnWindow } from "@/lib/games/turn-based";
import { OAQ_CONFIG } from "./config";
import type { OAnQuanDirection, OAnQuanPit, OAnQuanPlayer, OAnQuanState } from "./types";

type PlayerInput = {
  userId: string;
  username: string;
  displayName: string;
};

const bottomPits = [1, 2, 3, 4, 5];
const topPits = [7, 8, 9, 10, 11];

function nextIndex(index: number, direction: OAnQuanDirection) {
  return direction === "clockwise" ? (index + 1) % OAQ_CONFIG.boardSize : (index + OAQ_CONFIG.boardSize - 1) % OAQ_CONFIG.boardSize;
}

function pitValue(pit: OAnQuanPit) {
  return pit.smallStones + pit.bigStones * OAQ_CONFIG.quanValue;
}

function pitHasStones(pit: OAnQuanPit) {
  return pit.smallStones > 0 || pit.bigStones > 0;
}

function playerPits(player: OAnQuanPlayer) {
  return player.side === "bottom" ? bottomPits : topPits;
}

function canMove(state: OAnQuanState, userId: string) {
  const player = state.players[userId];
  if (!player) return false;
  return playerPits(player).some((index) => state.board[index].smallStones > 0);
}

function setTurn(state: OAnQuanState, userId: string | null, now = Date.now()) {
  state.currentTurnUserId = userId;
  const turn = createTurnWindow(now);
  state.turnStartedAt = turn.turnStartedAt;
  state.turnEndsAt = turn.turnEndsAt;
  state.turnDurationSeconds = turn.turnDurationSeconds;
}

function otherUserId(state: OAnQuanState, userId: string) {
  return Object.keys(state.players).find((candidate) => candidate !== userId) || null;
}

function collectRemainingAndEnd(state: OAnQuanState) {
  for (const player of Object.values(state.players)) {
    for (const index of playerPits(player)) {
      player.score += state.board[index].smallStones + state.board[index].bigStones * OAQ_CONFIG.quanValue;
      state.board[index].smallStones = 0;
      state.board[index].bigStones = 0;
    }
  }
  state.status = "ended";
  state.currentTurnUserId = null;
  const players = Object.values(state.players);
  const [first, second] = players;
  if (first && second && first.score === second.score) {
    state.winnerUserId = null;
    state.result = "draw";
  } else {
    state.winnerUserId = players.sort((a, b) => b.score - a.score)[0]?.userId || null;
    state.result = "win";
  }
}

function advanceTurn(state: OAnQuanState, fromUserId: string, reason: "move" | "timeout" | "no_moves" = "move", turnStartAt = Date.now()) {
  if (state.board[0].bigStones === 0 && state.board[6].bigStones === 0) {
    collectRemainingAndEnd(state);
    return;
  }

  const next = otherUserId(state, fromUserId);
  if (!next) return collectRemainingAndEnd(state);
  if (canMove(state, next)) {
    setTurn(state, next, turnStartAt);
    return;
  }
  if (canMove(state, fromUserId)) {
    state.lastMove = { userId: next, selectedPitIndex: null, direction: null, captured: 0, reason: "no_moves", createdAt: Date.now() };
    setTurn(state, fromUserId, turnStartAt);
    return;
  }
  state.lastMove = { userId: next, selectedPitIndex: null, direction: null, captured: 0, reason, createdAt: Date.now() };
  collectRemainingAndEnd(state);
}

export function createOAnQuanState(sessionId: string, roomId: string, players: PlayerInput[]) {
  const [bottom, top] = players.slice(0, 2);
  const board: OAnQuanPit[] = Array.from({ length: OAQ_CONFIG.boardSize }).map((_, index) => ({
    index,
    type: index === 0 || index === 6 ? "quan" : "dan",
    ownerUserId: bottomPits.includes(index) ? bottom.userId : topPits.includes(index) ? top.userId : null,
    smallStones: index === 0 || index === 6 ? 0 : OAQ_CONFIG.initialSmallStones,
    bigStones: index === 0 || index === 6 ? OAQ_CONFIG.initialBigStones : 0
  }));
  const turn = createTurnWindow();
  const firstUserId = Math.random() > 0.5 ? bottom.userId : top.userId;
  return {
    sessionId,
    roomId,
    gameKey: "o-an-quan",
    status: "playing",
    board,
    players: {
      [bottom.userId]: { ...bottom, score: 0, side: "bottom", connected: true },
      [top.userId]: { ...top, score: 0, side: "top", connected: true }
    },
    currentTurnUserId: firstUserId,
    ...turn,
    lastMove: null,
    winnerUserId: null,
    result: null,
    startedAt: Date.now(),
    updatedAt: Date.now()
  } satisfies OAnQuanState;
}

export function applyOAnQuanMove(state: OAnQuanState, userId: string, selectedPitIndex: number, direction: OAnQuanDirection) {
  if (state.status !== "playing") return "Game already ended.";
  if (state.currentTurnUserId !== userId) return "It is not your turn.";
  if (Date.now() < state.turnStartedAt) return "Wait for the stones to finish moving.";
  if (Date.now() > state.turnEndsAt) return "Your turn timed out.";
  if (direction !== "clockwise" && direction !== "counterclockwise") return "Invalid direction.";
  const player = state.players[userId];
  if (!player) return "You are not an active player.";
  if (!playerPits(player).includes(selectedPitIndex)) return "Choose one of your five dân pits.";
  const selectedPit = state.board[selectedPitIndex];
  if (selectedPit.type !== "dan" || selectedPit.smallStones <= 0) return "Choose a non-empty dân pit.";

  let stones = selectedPit.smallStones;
  selectedPit.smallStones = 0;
  let current = selectedPitIndex;
  let captured = 0;
  let animationFrames = 1;

  while (stones > 0) {
    current = nextIndex(current, direction);
    state.board[current].smallStones += 1;
    stones -= 1;
    animationFrames += 1;
    if (stones > 0) continue;

    const next = nextIndex(current, direction);
    const nextPit = state.board[next];
    if (nextPit.type === "dan" && pitHasStones(nextPit)) {
      stones = nextPit.smallStones;
      nextPit.smallStones = 0;
      current = next;
      animationFrames += 1;
      continue;
    }

    if (!pitHasStones(nextPit)) {
      let emptyIndex = next;
      let captureIndex = nextIndex(emptyIndex, direction);
      while (!pitHasStones(state.board[emptyIndex]) && pitHasStones(state.board[captureIndex])) {
        const capturePit = state.board[captureIndex];
        captured += pitValue(capturePit);
        capturePit.smallStones = 0;
        capturePit.bigStones = 0;
        animationFrames += 1;
        emptyIndex = nextIndex(captureIndex, direction);
        captureIndex = nextIndex(emptyIndex, direction);
      }
    }
  }

  player.score += captured;
  const animationDelayMs = Math.min(
    OAQ_CONFIG.maxMoveAnimationDelayMs,
    (animationFrames - 1) * OAQ_CONFIG.moveAnimationFrameMs
  );
  state.lastMove = { userId, selectedPitIndex, direction, captured, reason: "move", animationDelayMs, createdAt: Date.now() };
  advanceTurn(state, userId, "move", Date.now() + animationDelayMs + OAQ_CONFIG.postAnimationSettleMs);
  state.updatedAt = Date.now();
  return null;
}

export function timeoutOAnQuanTurn(state: OAnQuanState) {
  if (state.status !== "playing" || !state.currentTurnUserId) return false;
  const timedOutUserId = state.currentTurnUserId;
  state.lastMove = { userId: timedOutUserId, selectedPitIndex: null, direction: null, captured: 0, reason: "timeout", createdAt: Date.now() };
  advanceTurn(state, timedOutUserId, "timeout");
  state.updatedAt = Date.now();
  return true;
}
