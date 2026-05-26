"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { FleetCell, FleetShip, FleetSnapshot } from "@/lib/games/fleet-duel/types";

export function useFleetDuelSocket(roomId: string, currentUserId: string, onGameEnd?: () => void, initialSnapshot?: FleetSnapshot | null, roomEnded = false) {
  const [snapshot, setSnapshot] = useState<FleetSnapshot | null>(initialSnapshot ?? null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const applySnapshot = useCallback(
    (nextSnapshot: FleetSnapshot) => {
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
        setError(payload.error || "Could not connect to Fleet Duel server.");
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
        if (!roomEnded) socket.emit("fleet:sync", { roomId });
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("connect_error", (err) => setError(`Could not connect to Fleet Duel server. ${err.message}`));
      socket.on("game:start", applySnapshot);
      socket.on("fleet:snapshot", applySnapshot);
      socket.on("fleet:setup_updated", applySnapshot);
      socket.on("fleet:battle_started", applySnapshot);
      socket.on("fleet:shot_result", applySnapshot);
      socket.on("fleet:turn_changed", applySnapshot);
      socket.on("fleet:end", applySnapshot);
      socket.on("game:error", ({ message }: { message: string }) => setError(message));
    }

    connect();
    return () => {
      cancelled = true;
      activeSocket?.disconnect();
      socketRef.current = null;
    };
  }, [applySnapshot, roomEnded, roomId]);

  const placeShips = useCallback(
    (sessionId: string, ships: FleetShip[]) => {
      socketRef.current?.emit("fleet:place_ships", { roomId, sessionId, ships });
    },
    [roomId]
  );

  const confirmReady = useCallback(
    (sessionId: string) => {
      socketRef.current?.emit("fleet:confirm_ready", { roomId, sessionId });
    },
    [roomId]
  );

  const fire = useCallback(
    (sessionId: string, cell: FleetCell) => {
      socketRef.current?.emit("fleet:fire", { roomId, sessionId, x: cell.x, y: cell.y });
    },
    [roomId]
  );

  const backToLobby = useCallback(() => {
    socketRef.current?.emit("room:back_to_lobby", { roomId });
  }, [roomId]);

  return { snapshot, error, connected, placeShips, confirmReady, fire, backToLobby };
}
