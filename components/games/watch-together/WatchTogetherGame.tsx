"use client";

import { useState } from "react";
import { RotateCcw, Send } from "lucide-react";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { Button } from "@/components/ui/button";
import { extractYouTubeVideoId } from "@/lib/games/watch-together/utils";
import { YouTubeSyncPlayer } from "./YouTubeSyncPlayer";
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
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);

  function handleSetVideo() {
    const videoId = extractYouTubeVideoId(urlInput);
    if (!videoId) {
      setUrlError("Invalid YouTube URL or video ID.");
      return;
    }
    setUrlError(null);
    setVideo(videoId);
    setUrlInput("");
  }

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
          <div className="grid gap-1.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSetVideo(); }}
                placeholder="YouTube URL or video ID"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
              <Button onClick={handleSetVideo} disabled={!urlInput.trim()}>
                <Send size={16} /> Load
              </Button>
            </div>
            {urlError && <p className="text-sm font-bold text-red-500">{urlError}</p>}
          </div>
        )}
        <YouTubeSyncPlayer
          snapshot={snapshot}
          isHost={isHost}
          onPlay={play}
          onPause={pause}
          onHeartbeat={heartbeat}
        />
        {watchingPlayers.length > 0 && (
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
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-500">
            {!snapshot.videoId
              ? isHost
                ? "Load a YouTube video to start watching together."
                : "Waiting for host to choose a video..."
              : snapshot.status === "playing"
                ? isHost
                  ? "Playing · viewers are synced."
                  : "Synced with host"
                : snapshot.status === "paused"
                  ? "Paused"
                  : "Ready to play"}
          </p>
          {isHost && (
            <Button
              variant="secondary"
              disabled={returning}
              onClick={() => {
                setReturning(true);
                backToLobby();
              }}
            >
              <RotateCcw size={16} /> Back to Lobby
            </Button>
          )}
        </div>
      </div>
    </GameFullscreenShell>
  );
}
