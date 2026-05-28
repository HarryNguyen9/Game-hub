"use client";

import { useEffect, useRef } from "react";
import { WT_CONFIG } from "@/lib/games/watch-together/config";
import type { WatchTogetherSnapshot } from "@/lib/games/watch-together/types";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiLoaded = false;
const ytApiCallbacks: Array<() => void> = [];

function loadYTApi(callback: () => void) {
  if (ytApiLoaded && window.YT) {
    callback();
    return;
  }
  ytApiCallbacks.push(callback);
  if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return;
  const script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(script);
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    ytApiLoaded = true;
    prev?.();
    for (const cb of ytApiCallbacks.splice(0)) cb();
  };
}

export function YouTubeSyncPlayer({
  snapshot,
  isHost,
  onPlay,
  onPause,
  onHeartbeat
}: {
  snapshot: WatchTogetherSnapshot;
  isHost: boolean;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onHeartbeat: (currentTime: number) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const snapshotRef = useRef(snapshot);
  const isHostRef = useRef(isHost);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onHeartbeatRef = useRef(onHeartbeat);

  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);
  useEffect(() => { onHeartbeatRef.current = onHeartbeat; }, [onHeartbeat]);

  function applySnapshotToPlayer(player: YTPlayer, snap: WatchTogetherSnapshot) {
    if (isHostRef.current) return;
    isApplyingRemoteRef.current = true;
    try {
      const PLAYING = window.YT?.PlayerState.PLAYING ?? 1;
      const PAUSED = window.YT?.PlayerState.PAUSED ?? 2;
      const currentState = player.getPlayerState();

      if (snap.status === "playing") {
        const elapsed = (Date.now() - snap.lastUpdatedAt) / 1000;
        const expectedTime = snap.currentTime + elapsed;
        const drift = Math.abs(player.getCurrentTime() - expectedTime);
        if (drift > WT_CONFIG.driftThresholdSeconds) {
          player.seekTo(expectedTime, true);
        }
        if (currentState !== PLAYING) player.playVideo();
      } else if (snap.status === "paused") {
        const drift = Math.abs(player.getCurrentTime() - snap.currentTime);
        if (drift > WT_CONFIG.driftThresholdSeconds) {
          player.seekTo(snap.currentTime, true);
        }
        if (currentState !== PAUSED) player.pauseVideo();
      }
    } finally {
      setTimeout(() => { isApplyingRemoteRef.current = false; }, 600);
    }
  }

  function startHeartbeat(player: YTPlayer) {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setInterval(() => {
      if (!isHostRef.current) return;
      const PLAYING = window.YT?.PlayerState.PLAYING ?? 1;
      if (player.getPlayerState() === PLAYING) {
        onHeartbeatRef.current(player.getCurrentTime());
      }
    }, WT_CONFIG.syncHeartbeatMs);
  }

  function initPlayer(videoId: string) {
    if (!wrapperRef.current || !window.YT) return;
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    wrapperRef.current.innerHTML = "";
    const playerDiv = document.createElement("div");
    wrapperRef.current.appendChild(playerDiv);
    currentVideoIdRef.current = videoId;

    new window.YT.Player(playerDiv, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: isHostRef.current ? 1 : 0,
        modestbranding: 1,
        rel: 0,
        iv_load_policy: 3,
        disablekb: isHostRef.current ? 0 : 1
      },
      events: {
        onReady: (event) => {
          playerRef.current = event.target;
          startHeartbeat(event.target);
          if (!isHostRef.current) {
            applySnapshotToPlayer(event.target, snapshotRef.current);
          }
        },
        onStateChange: (event) => {
          if (!window.YT || isApplyingRemoteRef.current || !isHostRef.current) return;
          const { PLAYING, PAUSED } = window.YT.PlayerState;
          if (event.data === PLAYING) onPlayRef.current(event.target.getCurrentTime());
          else if (event.data === PAUSED) onPauseRef.current(event.target.getCurrentTime());
        }
      }
    });
  }

  useEffect(() => {
    const { videoId } = snapshot;
    if (!videoId) return;
    if (videoId === currentVideoIdRef.current && playerRef.current) return;
    loadYTApi(() => initPlayer(videoId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.videoId]);

  useEffect(() => {
    if (isHost || !playerRef.current) return;
    applySnapshotToPlayer(playerRef.current, snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, snapshot.status, snapshot.currentTime, snapshot.lastUpdatedAt]);

  useEffect(() => {
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      playerRef.current?.destroy();
    };
  }, []);

  if (!snapshot.videoId) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-400">
        {isHost ? "Enter a YouTube URL above to start watching." : "Waiting for host to choose a video..."}
      </div>
    );
  }

  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black ${!isHost ? "pointer-events-none" : ""}`}>
      <div ref={wrapperRef} className="absolute inset-0 [&_iframe]:!h-full [&_iframe]:!w-full" />
    </div>
  );
}
