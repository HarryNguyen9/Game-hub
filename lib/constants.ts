export const SESSION_COOKIE_NAME = "game_hub_session";
export const AVATAR_BUCKET = "avatars";

export const GAME_CATALOG = [
  {
    id: "flappy-rush",
    name: "Flappy Rush",
    displayName: "Flappy Rush",
    shortLabel: "Flappy",
    description: "Real-time flying race with ghost pigs.",
    minPlayers: 1,
    maxPlayers: 4,
    icon: "🐷",
    accent: "from-sky-200 to-lime-200"
  },
  {
    id: "fleet-duel",
    name: "Fleet Duel",
    displayName: "Fleet Duel",
    shortLabel: "Fleet",
    description: "Place your fleet and sink your rival's ships.",
    minPlayers: 2,
    maxPlayers: 2,
    icon: "🚢",
    accent: "from-cyan-200 to-blue-200"
  },
  {
    id: "o-an-quan",
    name: "Ô Ăn Quan",
    displayName: "Ô Ăn Quan",
    shortLabel: "Quan",
    description: "Vietnamese traditional strategy game.",
    minPlayers: 2,
    maxPlayers: 2,
    icon: "🪨",
    accent: "from-amber-200 to-lime-200"
  }
] as const;

export type GameId = (typeof GAME_CATALOG)[number]["id"];

export function getGameConfig(gameKey: string | null | undefined) {
  return GAME_CATALOG.find((game) => game.id === gameKey) || null;
}
