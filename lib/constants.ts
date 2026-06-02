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
    gameType: "realtime",
    icon: "🐷",
    accent: "from-sky-200 to-lime-200",
    howToPlay: {
      goal: "Fly as far as possible and outscore the other active players.",
      controls: ["Tap, click, or press Space to flap.", "After you crash, you keep watching the remaining players.", "Late joiners wait for the next round."],
      rules: ["The server owns gravity, pipes, collisions, score, death, and winner.", "Your pig earns points by passing pipes.", "The round ends when every active player has crashed."]
    }
  },
  {
    id: "fleet-duel",
    name: "Fleet Duel",
    displayName: "Fleet Duel",
    shortLabel: "Fleet",
    description: "Place your fleet and sink your rival's ships.",
    minPlayers: 2,
    maxPlayers: 2,
    gameType: "turn-based",
    turnDurationSeconds: 30,
    icon: "🚢",
    turnDurationLabel: "30s / turn",
    accent: "from-cyan-200 to-blue-200",
    howToPlay: {
      goal: "Place your fleet, then sink every enemy ship before yours goes down.",
      controls: ["Setup: place ships, rotate them, randomize, then confirm fleet.", "Battle: tap an enemy water tile when it is your turn.", "Use the hit, miss, rock, and sunk markers to track the enemy board."],
      rules: ["Two active players only.", "Each battle turn lasts 30 seconds.", "Ships and rocks are private until revealed by shots.", "The server validates placement, shots, hits, misses, sunk ships, and winner."]
    }
  },
  {
    id: "o-an-quan",
    name: "Ô Ăn Quan",
    displayName: "Ô Ăn Quan",
    shortLabel: "Quan",
    description: "Vietnamese traditional strategy game.",
    minPlayers: 2,
    maxPlayers: 2,
    gameType: "turn-based",
    turnDurationSeconds: 30,
    icon: "🪨",
    turnDurationLabel: "30s / turn",
    accent: "from-amber-200 to-lime-200",
    howToPlay: {
      goal: "Capture more stones than your opponent using the simplified online O An Quan rules.",
      controls: ["On your turn, choose one of your five small pits that has stones.", "Choose left or right to sow stones around the board.", "Watch the sowing animation to understand captures and score changes."],
      rules: ["Two active players only.", "Each turn lasts 30 seconds after the previous move animation finishes.", "Quan pits cannot be picked up to move, but stones can pass through them.", "The server applies sowing, captures, timeout, score, and game end."]
    }
  },
  {
    id: "chess",
    name: "Chess",
    displayName: "Chess",
    shortLabel: "Chess",
    description: "Classic chess duel with a 30s turn timer.",
    minPlayers: 2,
    maxPlayers: 2,
    gameType: "turn-based",
    turnDurationSeconds: 30,
    icon: "♟️",
    turnDurationLabel: "30s / turn",
    accent: "from-indigo-100 to-amber-100",
    howToPlay: {
      goal: "Checkmate your opponent, or win when they run out of time.",
      controls: ["Tap one of your pieces, then tap the destination square.", "Promotion defaults to Queen in this MVP.", "Use the move list to review recent moves."],
      rules: ["Two active players only.", "White moves first, and colors are assigned when the game starts.", "Each move has a 30 second timer.", "Invalid moves are rejected by chess.js on the server.", "Timeout, checkmate, draw, and resignation are decided by the server."]
    }
  },
  {
    id: "elemental-duels",
    name: "Elemental Duels 2D",
    displayName: "Elemental Duels 2D",
    shortLabel: "Elemental",
    description: "1v1 elemental tower defense duel.",
    minPlayers: 2,
    maxPlayers: 2,
    gameType: "realtime-strategy",
    supportsLateJoin: false,
    icon: "🔥",
    accent: "from-orange-100 to-cyan-200",
    howToPlay: {
      goal: "Defend your base while sending defeated monsters to pressure your opponent.",
      controls: ["Tap a glowing tile to build a tower.", "Tap a tower to upgrade, sell, or change target priority.", "Choose a monster profile and element to send when your towers defeat monsters."],
      rules: ["Two active players only.", "The server owns monster movement, tower cooldowns, damage, status effects, gold, base HP, and winner.", "Fire burns, Ice slows, Lightning chains, and Earth hits hard with knockback.", "Element counters matter: use the cycle to gain damage advantage."]
    }
  },
  {
    id: "watch-together",
    name: "Watch Together",
    displayName: "Watch Together",
    shortLabel: "Watch",
    description: "Co-watch YouTube videos in sync with your room.",
    minPlayers: 1,
    maxPlayers: 8,
    gameType: "watch",
    icon: "📺",
    accent: "from-red-100 to-rose-200",
    howToPlay: {
      goal: "Watch YouTube videos together in the same room.",
      controls: ["The host searches or pastes a YouTube video.", "Host playback changes sync to the room.", "Other members follow the shared room player state."],
      rules: ["One to eight active members can join.", "This is a social watch room, not a score game.", "The socket server syncs selected video and playback state."]
    }
  }
] as const;

export type GameId = (typeof GAME_CATALOG)[number]["id"];
export type GameConfig = (typeof GAME_CATALOG)[number];

export function getGameConfig(gameKey: string | null | undefined) {
  return GAME_CATALOG.find((game) => game.id === gameKey) || null;
}
