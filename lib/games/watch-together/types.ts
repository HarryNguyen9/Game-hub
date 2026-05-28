export type WatchTogetherStatus = "idle" | "playing" | "paused";

export type WatchTogetherPlayer = {
  userId: string;
  username: string;
  displayName: string;
};

export type WatchTogetherState = {
  sessionId: string;
  roomId: string;
  gameKey: "watch-together";
  hostUserId: string;
  videoId: string | null;
  status: WatchTogetherStatus;
  currentTime: number;
  lastUpdatedAt: number;
  players: Record<string, WatchTogetherPlayer>;
};

export type WatchTogetherSnapshot = WatchTogetherState & {
  serverTime: number;
};
