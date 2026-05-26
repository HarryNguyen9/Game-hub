import type { FleetPlayerState, FleetPublicPlayer, FleetShip, FleetSnapshot, FleetState } from "./types";

function publicShipsForViewer(player: FleetPlayerState, viewerUserId: string): FleetPublicPlayer["ships"] {
  const isSelf = player.userId === viewerUserId;
  return player.ships.map((ship) => {
    if (isSelf || ship.sunk) {
      return { id: ship.id, size: ship.size, cells: ship.cells.map((cell) => ({ ...cell })), hits: ship.hits.map((cell) => ({ ...cell })), sunk: ship.sunk };
    }
    return { id: ship.id, size: ship.size, hits: ship.hits.map((cell) => ({ ...cell })), sunk: ship.sunk };
  });
}

function publicPlayer(player: FleetPlayerState, viewerUserId: string): FleetPublicPlayer {
  return {
    userId: player.userId,
    username: player.username,
    displayName: player.displayName,
    readyToBattle: player.readyToBattle,
    ships: publicShipsForViewer(player, viewerUserId),
    shots: player.shots.map((shot) => ({ ...shot }))
  };
}

function visibleBlockedCells(state: FleetState, viewerUserId: string) {
  if (state.status === "setup") return state.blockedCells.map((cell) => ({ ...cell }));
  const visible = new Map<string, { x: number; y: number }>();
  for (const player of Object.values(state.players)) {
    for (const shot of player.shots) {
      if (shot.result !== "rock") continue;
      const isViewerShot = player.userId === viewerUserId;
      const isShotAtViewer = shot.targetUserId === viewerUserId;
      if (isViewerShot || isShotAtViewer) visible.set(`${shot.x}:${shot.y}`, { x: shot.x, y: shot.y });
    }
  }
  return [...visible.values()];
}

export function serializeFleetStateForUser(state: FleetState, viewerUserId: string): FleetSnapshot {
  const you = state.players[viewerUserId];
  const opponent = Object.values(state.players).find((player) => player.userId !== viewerUserId) || null;
  return {
    sessionId: state.sessionId,
    roomId: state.roomId,
    gameKey: "fleet-duel",
    status: state.status,
    boardSize: state.boardSize,
    boardTheme: state.boardTheme,
    shipDefinitions: state.shipDefinitions.map((ship) => ({
      ...ship,
      shape: ship.shape.map((cell) => ({ ...cell }))
    })),
    blockedCells: visibleBlockedCells(state, viewerUserId),
    currentTurnUserId: state.currentTurnUserId,
    turnStartedAt: state.turnStartedAt,
    turnEndsAt: state.turnEndsAt,
    turnDurationSeconds: state.turnDurationSeconds,
    winnerUserId: state.winnerUserId,
    you: publicPlayer(you, viewerUserId),
    opponent: opponent ? publicPlayer(opponent, viewerUserId) : null,
    players: Object.values(state.players).map((player) => ({
      userId: player.userId,
      username: player.username,
      displayName: player.displayName,
      readyToBattle: player.readyToBattle
    }))
  };
}

export function serializeFleetFinalState(state: FleetState) {
  return {
    ...state,
    players: Object.fromEntries(
      Object.entries(state.players).map(([userId, player]) => [
        userId,
        {
          ...player,
          ships: player.ships.map((ship: FleetShip) => ({ ...ship, cells: ship.cells.map((cell) => ({ ...cell })), hits: ship.hits.map((cell) => ({ ...cell })) })),
          shots: player.shots.map((shot) => ({ ...shot }))
        }
      ])
    )
  };
}
