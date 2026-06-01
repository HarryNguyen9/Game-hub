"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ElementKey, ElementalSnapshot, TowerTargetMode } from "@/lib/games/elemental-duels/types";

export function useElementalDuelsSocket(roomId: string, onGameEnd?: () => void, initialSnapshot?: ElementalSnapshot | null, roomEnded = false) {
  const [snapshot, setSnapshot] = useState<ElementalSnapshot | null>(initialSnapshot ?? null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const snapshotRef = useRef<ElementalSnapshot | null>(initialSnapshot ?? null);
  const skipLiveSync = roomEnded || initialSnapshot?.status === "ended";

  const applySnapshot = useCallback(
    (nextSnapshot: ElementalSnapshot) => {
      if (nextSnapshot.roomId !== roomId) return;
      setError("");
      snapshotRef.current = nextSnapshot;
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
        setError(payload.error || "Could not connect to game server.");
        return;
      }
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
      if (!socketUrl) {
        setError("Missing NEXT_PUBLIC_SOCKET_URL. Set it to the Socket.IO server URL.");
        return;
      }

      const socket = io(socketUrl, { auth: { token: payload.token } });
      activeSocket = socket;
      socketRef.current = socket;
      socket.on("connect", () => {
        setConnected(true);
        socket.emit("room:join", { roomId, presence: false });
        if (skipLiveSync) return;
        socket.emit("elemental:sync", { roomId });
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("connect_error", (connectError) =>
        setError(`Could not connect to Elemental server. ${connectError.message ? `(${connectError.message})` : ""}`)
      );
      socket.on("elemental:snapshot", applySnapshot);
      socket.on("elemental:end", applySnapshot);
      socket.on("game:start", applySnapshot);
      socket.on("elemental:error", ({ message }: { message: string }) => setError(message));
      socket.on("game:error", ({ message }: { message: string }) => setError(message));
    }

    connect();
    return () => {
      cancelled = true;
      activeSocket?.disconnect();
      socketRef.current = null;
    };
  }, [applySnapshot, roomId, skipLiveSync]);

  const emitAction = useCallback((event: string, payload: Record<string, unknown>) => {
    const current = snapshotRef.current;
    if (!current) return;
    socketRef.current?.emit(event, { roomId, sessionId: current.sessionId, ...payload });
  }, [roomId]);

  const buildTower = useCallback((towerType: string, x: number, y: number) => emitAction("elemental:build_tower", { towerType, x, y }), [emitAction]);
  const upgradeTower = useCallback((towerId: string) => emitAction("elemental:upgrade_tower", { towerId }), [emitAction]);
  const sellTower = useCallback((towerId: string) => emitAction("elemental:sell_tower", { towerId }), [emitAction]);
  const setTargetMode = useCallback((towerId: string, mode: TowerTargetMode) => emitAction("elemental:set_tower_target_mode", { towerId, mode }), [emitAction]);
  const selectSendElement = useCallback((element: ElementKey) => emitAction("elemental:select_send_element", { element }), [emitAction]);
  const selectMonsterType = useCallback((monsterType: string) => emitAction("elemental:select_monster_type", { monsterType }), [emitAction]);
  const backToLobby = useCallback(() => socketRef.current?.emit("room:back_to_lobby", { roomId }), [roomId]);

  return {
    snapshot,
    error,
    connected,
    buildTower,
    upgradeTower,
    sellTower,
    setTargetMode,
    selectSendElement,
    selectMonsterType,
    backToLobby
  };
}
