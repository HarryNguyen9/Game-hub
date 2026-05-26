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
    blockedCells: state.blockedCells.map((cell) => ({ ...cell })),
    currentTurnUserId: state.currentTurnUserId,
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
