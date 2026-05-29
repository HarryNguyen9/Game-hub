"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { Button } from "@/components/ui/button";
import { YouTubeSyncPlayer } from "./YouTubeSyncPlayer";
import { YouTubeVideoSearch } from "./YouTubeVideoSearch";
import { useWatchTogetherSocket } from "./useWatchTogetherSocket";

export function WatchTogetherGame({
  roomId,
  currentUserId,
  isHost,
  expanded,
  onToggleExpanded
}: {
  roomId: string;
  currentUserId: string;
  isHost: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const { snapshot, connected, error, setVideo, play, pause, heartbeat, backToLobby } = useWatchTogetherSocket(roomId);
  const [returning, setReturning] = useState(false);

  const header = (
    <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
      {connected ? "Connected" : "Reconnecting"}
    </span>
  );

  if (!snapshot) {
    return (
      <GameFullscreenShell expanded={expanded} onToggleExpanded={onToggleExpanded} header={header}>
        <div className="grid min-h-[22rem] place-items-center rounded-[1.5rem] bg-slate-50 font-black text-slate-600">
          {connected ? "Loading Watch Together..." : "Connecting..."}
        </div>
      </GameFullscreenShell>
    );
  }

  const watchingPlayers = Object.values(snapshot.players);

  return (
    <GameFullscreenShell expanded={expanded} onToggleExpanded={onToggleExpanded} header={header}>
      <div className="grid gap-4">
        {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
        {isHost && (
          <YouTubeVideoSearch onSelect={(videoId) => { setVideo(videoId); }} />
        )}
        <YouTubeSyncPlayer
          snapshot={snapshot}
          isHost={isHost}
          onPlay={play}
          onPause={pause}
          onHeartbeat={heartbeat}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {watchingPlayers.map((player) => (
              <span
                key={player.userId}
                className={`rounded-full px-3 py-1.5 text-xs font-black ${player.userId === currentUserId ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}
              >
                {player.displayName}
                {player.userId === snapshot.hostUserId ? " · Host" : ""}
              </span>
            ))}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
            snapshot.status === "playing" ? "bg-emerald-100 text-emerald-700" :
            snapshot.status === "paused" ? "bg-amber-100 text-amber-700" :
            "bg-slate-100 text-slate-500"
          }`}>
            {!snapshot.videoId ? "Idle" : snapshot.status === "playing" ? "Playing" : snapshot.status === "paused" ? "Paused" : "Ready"}
          </span>
        </div>
        {!snapshot.videoId && (
          <p className="text-sm font-semibold text-slate-400">
            {isHost ? "Load a YouTube video to start watching together." : "Waiting for host to choose a video..."}
          </p>
        )}
        {isHost && (
          <Button
            variant="secondary"
            className="w-full justify-center"
            disabled={returning}
            onClick={() => {
              setReturning(true);
              backToLobby();
            }}
          >
            <RotateCcw size={16} /> {returning ? "Returning..." : "Back to Lobby"}
          </Button>
        )}
      </div>
    </GameFullscreenShell>
  );
}
