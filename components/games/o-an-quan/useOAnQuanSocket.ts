"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { OAnQuanDirection, OAnQuanSnapshot } from "@/lib/games/o-an-quan/types";

export function useOAnQuanSocket(roomId: string, onGameEnd?: () => void, initialSnapshot?: OAnQuanSnapshot | null, roomEnded = false) {
  const [snapshot, setSnapshot] = useState<OAnQuanSnapshot | null>(initialSnapshot ?? null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const applySnapshot = useCallback(
    (nextSnapshot: OAnQuanSnapshot) => {
      if (nextSnapshot.roomId !== roomId) return;
      setError("");
      setSnapshot(nextSnapshot);
      if (nextSnapshot.status === "ended") onGameEnd?.();
    },
    [onGameEnd, roomId]
  );

  useEffect(() => {
    let cancelled = false;
    let activeSocket: Socket | null = null;

    async function connect() {
      const response = await fetch("/api/socket-token");
      const payload = await response.json();
      if (!response.ok || cancelled) {
        setError(payload.error || "Could not connect to Ô Ăn Quan server.");
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
        if (!roomEnded) socket.emit("oaq:sync", { roomId });
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("connect_error", (err) => setError(`Could not connect to Ô Ăn Quan server. ${err.message}`));
      socket.on("game:start", applySnapshot);
      socket.on("oaq:snapshot", applySnapshot);
      socket.on("oaq:move_result", applySnapshot);
      socket.on("oaq:turn_timeout", applySnapshot);
      socket.on("oaq:end", applySnapshot);
      socket.on("game:error", ({ message }: { message: string }) => setError(message));
    }

    connect();
    return () => {
      cancelled = true;
      activeSocket?.disconnect();
      socketRef.current = null;
    };
  }, [applySnapshot, roomEnded, roomId]);

  const move = useCallback(
    (sessionId: string, selectedPitIndex: number, direction: OAnQuanDirection) => {
      socketRef.current?.emit("oaq:move", { roomId, sessionId, selectedPitIndex, direction });
    },
    [roomId]
  );

  const backToLobby = useCallback(() => {
    socketRef.current?.emit("room:back_to_lobby", { roomId });
  }, [roomId]);

  return { snapshot, error, connected, move, backToLobby };
}
