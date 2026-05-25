export const SESSION_COOKIE_NAME = "game_hub_session";
export const AVATAR_BUCKET = "avatars";

export const GAME_CATALOG = [
  {
    id: "flappy-duel",
    name: "Flappy Duel",
    description: "Server-authoritative flaps, shared pipes, last bird flying wins.",
    accent: "from-sky-200 to-lime-200"
  }
] as const;

export type GameId = (typeof GAME_CATALOG)[number]["id"];
