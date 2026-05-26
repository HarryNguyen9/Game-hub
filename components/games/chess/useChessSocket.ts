"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ChessSnapshot } from "@/lib/games/chess/types";

export function useChessSocket(roomId: string, onGameEnd?: () => void, initialSnapshot?: ChessSnapshot | null, roomEnded = false) {
  const [snapshot, setSnapshot] = useState<ChessSnapshot | null>(initialSnapshot ?? null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const applySnapshot = useCallback(
    (nextSnapshot: ChessSnapshot) => {
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
        setError(payload.error || "Could not connect to Chess server.");
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
        if (!roomEnded) socket.emit("chess:sync", { roomId });
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("connect_error", (err) => setError(`Could not connect to Chess server. ${err.message}`));
      socket.on("game:start", applySnapshot);
      socket.on("chess:snapshot", applySnapshot);
      socket.on("chess:move_result", applySnapshot);
      socket.on("chess:turn_changed", applySnapshot);
      socket.on("chess:turn_timeout", applySnapshot);
      socket.on("chess:end", applySnapshot);
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
    (sessionId: string, from: string, to: string, promotion = "q") => {
      socketRef.current?.emit("chess:move", { roomId, sessionId, from, to, promotion });
    },
    [roomId]
  );

  const resign = useCallback(
    (sessionId: string) => {
      socketRef.current?.emit("chess:resign", { roomId, sessionId });
    },
    [roomId]
  );

  const backToLobby = useCallback(() => {
    socketRef.current?.emit("room:back_to_lobby", { roomId });
  }, [roomId]);

  return { snapshot, error, connected, move, resign, backToLobby };
}
