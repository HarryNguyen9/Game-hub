"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { FlappySnapshot } from "@/lib/games/flappy-duel/types";

type SyncResponse =
  | { ok: true; snapshot: FlappySnapshot; countdown: number | null }
  | { ok: false; error: string };

export function useFlappyDuelSocket(roomId: string, currentUserId: string, onGameEnd?: () => void) {
  const [snapshot, setSnapshot] = useState<FlappySnapshot | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const inputSeq = useRef(0);

  const applySyncResponse = useCallback(
    (response: SyncResponse) => {
      if (!response.ok) {
        setError(response.error);
        return;
      }
      if (response.snapshot.roomId !== roomId) return;
      setError("");
      setCountdown(response.countdown);
      setSnapshot(response.snapshot);
    },
    [roomId]
  );

  const syncGame = useCallback(() => {
    socketRef.current?.timeout(1500).emit("game:sync", { roomId }, (error: Error | null, response?: SyncResponse) => {
      if (error) {
        setError("Socket server did not answer game:sync. Stop old socket processes, restart npm run socket:dev, then start a fresh room.");
        return;
      }
      if (response) applySyncResponse(response);
    });
  }, [applySyncResponse, roomId]);

  useEffect(() => {
    let cancelled = false;
    let activeSocket: Socket | null = null;

    async function connect() {
      const response = await fetch("/api/socket-token");
      const payload = await response.json();
      if (!response.ok || cancelled) {
        setError(payload.error || "Could not connect to game server.");
        return;
      }

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
      if (!socketUrl) {
        setError("Missing NEXT_PUBLIC_SOCKET_URL. Set it to the Socket.IO server URL.");
        return;
      }
      const socket = io(socketUrl, {
        auth: { token: payload.token }
      });
      activeSocket = socket;
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        setError("");
        socket.emit("room:join", { roomId, presence: false });
        socket.timeout(1500).emit("game:sync", { roomId }, (error: Error | null, response?: SyncResponse) => {
          if (error) {
            setError("Socket server did not answer game:sync. Stop old socket processes, restart npm run socket:dev, then start a fresh room.");
            return;
          }
          if (response) applySyncResponse(response);
        });
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("connect_error", () => setError("Could not connect to game server."));
      socket.on("game:countdown", ({ roomId: eventRoomId, remaining }: { roomId: string; remaining: number }) => {
        if (eventRoomId === roomId) setCountdown(remaining);
      });
      socket.on("game:start", (nextSnapshot: FlappySnapshot) => {
        if (nextSnapshot.roomId !== roomId) return;
        setCountdown(null);
        setSnapshot(nextSnapshot);
      });
      socket.on("game:snapshot", (nextSnapshot: FlappySnapshot) => {
        if (nextSnapshot.roomId !== roomId) return;
        setError("");
        setCountdown(null);
        setSnapshot(nextSnapshot);
      });
      socket.on("game:end", (nextSnapshot: FlappySnapshot) => {
        if (nextSnapshot.roomId !== roomId) return;
        setError("");
        setCountdown(null);
        setSnapshot(nextSnapshot);
        onGameEnd?.();
      });
      socket.on("game:error", ({ message }: { message: string }) => setError(message));
    }

    connect();
    return () => {
      cancelled = true;
      activeSocket?.disconnect();
      socketRef.current = null;
    };
  }, [applySyncResponse, onGameEnd, roomId]);

  const flap = useCallback(() => {
    const player = snapshot?.players[currentUserId];
    if (!snapshot || snapshot.status !== "playing" || !player?.alive) return;
    inputSeq.current += 1;
    socketRef.current?.emit("game:input", {
      roomId,
      sessionId: snapshot.sessionId,
      input: "flap",
      inputId: `${currentUserId}-${inputSeq.current}`,
      clientTime: Date.now()
    });
  }, [currentUserId, roomId, snapshot]);

  const backToLobby = useCallback(() => {
    socketRef.current?.emit("room:back_to_lobby", { roomId });
  }, [roomId]);

  useEffect(() => {
    if (!connected || snapshot || countdown) return;

    const syncTimer = window.setTimeout(() => {
      syncGame();
    }, 1200);
    const errorTimer = window.setTimeout(() => {
      setError("Still waiting for the game snapshot. Try Back to Lobby, restart the socket server, then start a fresh round.");
    }, 5000);

    return () => {
      window.clearTimeout(syncTimer);
      window.clearTimeout(errorTimer);
    };
  }, [connected, countdown, roomId, snapshot, syncGame]);

  return { snapshot, countdown, error, connected, flap, backToLobby };
}
