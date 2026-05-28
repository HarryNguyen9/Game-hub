"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { WatchTogetherSnapshot } from "@/lib/games/watch-together/types";

export function useWatchTogetherSocket(roomId: string) {
  const [snapshot, setSnapshot] = useState<WatchTogetherSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const applySnapshot = useCallback(
    (next: WatchTogetherSnapshot) => {
      if (next.roomId !== roomId) return;
      setError(null);
      setSnapshot(next);
    },
    [roomId]
  );

  useEffect(() => {
    let cancelled = false;
    let activeSocket: Socket | null = null;

    async function connect() {
      const response = await fetch("/api/socket-token");
      const payload = await response.json();
      if (cancelled || !response.ok) {
        setError(payload.error || "Could not connect to Watch Together server.");
        return;
      }
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
      if (!socketUrl) {
        setError("Missing NEXT_PUBLIC_SOCKET_URL.");
        return;
      }
      const socket = io(socketUrl, { auth: { token: payload.token } });
      activeSocket = socket;
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("room:join", { roomId, presence: false });
        socket.emit("watch-together:sync", { roomId });
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("connect_error", (err) => {
        setConnected(false);
        setError(`Could not connect to Watch Together server. ${err.message}`);
      });
      socket.on("game:start", applySnapshot);
      socket.on("watch-together:snapshot", applySnapshot);
      socket.on("game:error", ({ message }: { message: string }) => setError(message));
    }

    connect();

    return () => {
      cancelled = true;
      activeSocket?.disconnect();
      socketRef.current = null;
    };
  }, [applySnapshot, roomId]);

  const setVideo = useCallback(
    (videoId: string) => {
      socketRef.current?.emit("watch-together:set_video", { roomId, videoId });
    },
    [roomId]
  );

  const play = useCallback(
    (currentTime: number) => {
      socketRef.current?.emit("watch-together:play", { roomId, currentTime });
    },
    [roomId]
  );

  const pause = useCallback(
    (currentTime: number) => {
      socketRef.current?.emit("watch-together:pause", { roomId, currentTime });
    },
    [roomId]
  );

  const seek = useCallback(
    (currentTime: number) => {
      socketRef.current?.emit("watch-together:seek", { roomId, currentTime });
    },
    [roomId]
  );

  const heartbeat = useCallback(
    (currentTime: number) => {
      socketRef.current?.emit("watch-together:heartbeat", { roomId, currentTime });
    },
    [roomId]
  );

  const backToLobby = useCallback(() => {
    socketRef.current?.emit("room:back_to_lobby", { roomId });
  }, [roomId]);

  return { snapshot, connected, error, setVideo, play, pause, seek, heartbeat, backToLobby };
}
