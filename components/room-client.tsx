"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { Check, Gamepad2, LogOut, Play, RotateCcw, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { FlappyRushGame } from "@/components/games/flappy-rush/FlappyRushGame";
import { FleetDuelGame } from "@/components/games/fleet-duel/FleetDuelGame";
import { OAnQuanGame } from "@/components/games/o-an-quan/OAnQuanGame";
import { ChessGame } from "@/components/games/chess/ChessGame";
import { WatchTogetherGame } from "@/components/games/watch-together/WatchTogetherGame";
import { GAME_CATALOG } from "@/lib/constants";
import type { FlappySnapshot } from "@/lib/games/flappy-rush/types";
import type { FleetSnapshot } from "@/lib/games/fleet-duel/types";
import type { OAnQuanSnapshot } from "@/lib/games/o-an-quan/types";
import type { ChessSnapshot } from "@/lib/games/chess/types";

type RoomStatus = "waiting" | "playing" | "ended" | "closed";
type Member = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "host" | "player";
  ready: boolean;
  participationStatus: "lobby" | "active_game" | "waiting_next_round";
};

type Snapshot = {
  roomId: string;
  status: RoomStatus;
  room?: { game_key: string | null; min_players?: number; max_players?: number } | null;
  members: Member[];
};

type OpponentLeftNotice = {
  message: string;
  action: "redirect_dashboard" | "return_to_lobby";
};

function titleLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function roomLimits(gameKey: string | null, minPlayers: number, maxPlayers: number) {
  const game = GAME_CATALOG.find((item) => item.id === gameKey);
  return {
    minPlayers: game?.minPlayers ?? minPlayers,
    maxPlayers: game?.maxPlayers ?? maxPlayers,
    hasSelectedGame: Boolean(game)
  };
}

function GameOptionVisual({ gameId }: { gameId: string }) {
  if (gameId === "chess") {
    return (
      <div className="relative h-24 overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-indigo-100 via-white to-amber-100 shadow-inner">
        <div className="absolute left-3 top-3 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-indigo-700 shadow-sm">2 players</div>
        <div className="absolute right-3 top-3 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-amber-700 shadow-sm">Turn-based</div>
        <div className="absolute inset-x-8 bottom-5 grid grid-cols-6 overflow-hidden rounded-xl border-2 border-white/80 shadow-sm">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} className={`h-5 ${index % 2 === Math.floor(index / 6) % 2 ? "bg-[#7fc8a9]" : "bg-[#fff4c7]"}`} />
          ))}
        </div>
        <div className="absolute left-1/2 top-[48%] -translate-x-1/2 text-4xl drop-shadow-sm">♟️</div>
      </div>
    );
  }
  if (gameId === "o-an-quan") {
    return (
      <div className="relative h-24 overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-amber-100 via-lime-100 to-emerald-100 shadow-inner">
        <div className="absolute left-3 top-3 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-amber-700 shadow-sm">2 players</div>
        <div className="absolute right-3 top-3 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-emerald-700 shadow-sm">Turn-based</div>
        <div className="absolute inset-x-7 bottom-5 grid grid-cols-[2.2rem_1fr_2.2rem] gap-1">
          <div className="h-12 rounded-full border-2 border-stone-300 bg-amber-200" />
          <div className="grid gap-1">
            <div className="grid grid-cols-5 gap-1">{Array.from({ length: 5 }).map((_, index) => <span key={`t-${index}`} className="h-5 rounded-lg bg-white/75" />)}</div>
            <div className="grid grid-cols-5 gap-1">{Array.from({ length: 5 }).map((_, index) => <span key={`b-${index}`} className="h-5 rounded-lg bg-white/75" />)}</div>
          </div>
          <div className="h-12 rounded-full border-2 border-stone-300 bg-amber-200" />
        </div>
      </div>
    );
  }
  if (gameId === "fleet-duel") {
    return (
      <div className="relative h-24 overflow-hidden rounded-[1.25rem] bg-gradient-to-b from-cyan-200 via-sky-100 to-blue-200 shadow-inner">
        <div className="absolute inset-x-0 bottom-0 h-10 bg-cyan-300/50" />
        <div className="absolute left-3 top-3 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-cyan-700 shadow-sm">2 players</div>
        <div className="absolute right-3 top-3 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-blue-700 shadow-sm">Turn-based</div>
        <div className="absolute left-[24%] top-[50%] h-7 w-16 rounded-b-xl rounded-t-md bg-slate-700 shadow-md">
          <div className="absolute -top-4 left-5 h-4 w-7 rounded-t-lg bg-slate-500" />
          <div className="absolute -right-4 top-2 h-0 w-0 border-y-[8px] border-l-[16px] border-y-transparent border-l-slate-700" />
          <div className="absolute bottom-1 left-2 h-1 w-10 rounded-full bg-cyan-200" />
        </div>
        <div className="absolute right-[22%] top-[52%] h-6 w-14 rounded-b-xl rounded-t-md bg-rose-400 opacity-75 shadow-md">
          <div className="absolute -top-3 left-4 h-3 w-6 rounded-t-lg bg-rose-300" />
          <div className="absolute -left-3 top-2 h-0 w-0 border-y-[7px] border-r-[14px] border-y-transparent border-r-rose-400" />
        </div>
      </div>
    );
  }

  if (gameId === "watch-together") {
    return (
      <div className="relative h-24 overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-red-100 via-rose-50 to-rose-200 shadow-inner">
        <div className="absolute left-3 top-3 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-red-700 shadow-sm">1-8 players</div>
        <div className="absolute right-3 top-3 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-rose-600 shadow-sm">Watch</div>
        <div className="absolute inset-x-[24%] bottom-2 top-10 rounded-xl border-4 border-slate-700 bg-slate-900 shadow-md">
          <div className="absolute inset-1 flex items-center justify-center rounded-lg bg-red-600">
            <div className="h-0 w-0 border-y-[9px] border-l-[16px] border-y-transparent border-l-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-24 overflow-hidden rounded-[1.25rem] bg-gradient-to-b from-sky-200 via-emerald-50 to-amber-100 shadow-inner">
      <div className="absolute left-6 top-5 h-4 w-16 rounded-full bg-white/55" />
      <div className="absolute right-8 top-6 h-4 w-14 rounded-full bg-white/55" />
      <div className="absolute bottom-0 left-0 h-2 w-full bg-sky-300" />
      <div className="absolute right-8 top-0 h-9 w-9 rounded-b-lg border-2 border-emerald-500 bg-emerald-300" />
      <div className="absolute bottom-2 right-8 h-10 w-9 rounded-t-lg border-2 border-emerald-500 bg-emerald-300" />
      <div className="absolute left-3 top-3 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-sky-700 shadow-sm">1-4 players</div>
      <div className="absolute right-3 top-3 z-20 whitespace-nowrap rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase text-rose-500 shadow-sm">Realtime</div>
      <div className="absolute left-[30%] top-[48%] h-10 w-11 -rotate-3 rounded-[50%] border-2 border-slate-800 bg-pink-300 shadow-md">
        <div className="absolute -top-1 left-2 h-3.5 w-3 rounded-full border border-slate-800 bg-pink-400" />
        <div className="absolute -top-0.5 right-2 h-3 w-2.5 rounded-full border border-slate-800 bg-pink-400" />
        <div className="absolute left-5 top-2 h-2.5 w-2.5 rounded-full bg-white" />
        <div className="absolute right-1.5 top-2.5 h-2 w-2 rounded-full bg-white" />
        <div className="absolute left-[1.45rem] top-[0.65rem] h-1.5 w-1.5 rounded-full bg-slate-900" />
        <div className="absolute right-[0.55rem] top-[0.72rem] h-1.5 w-1.5 rounded-full bg-slate-900" />
        <div className="absolute bottom-2 right-0 h-4 w-6 rounded-full border border-slate-700 bg-pink-200" />
      </div>
    </div>
  );
}

export function RoomClient({
  roomId,
  roomName,
  roomCode,
  hasPassword,
  initialMembers,
  initialStatus,
  isHost,
  currentUserId,
  initialGameKey,
  initialGameSnapshot,
  initialFleetSnapshot,
  initialOAnQuanSnapshot,
  initialChessSnapshot,
  initialMinPlayers,
  initialMaxPlayers
}: {
  roomId: string;
  roomName: string;
  roomCode: string | null;
  hasPassword: boolean;
  initialMembers: Member[];
  initialStatus: RoomStatus;
  isHost: boolean;
  currentUserId: string;
  initialGameKey: string | null;
  initialGameSnapshot: FlappySnapshot | null;
  initialFleetSnapshot: FleetSnapshot | null;
  initialOAnQuanSnapshot: OAnQuanSnapshot | null;
  initialChessSnapshot: ChessSnapshot | null;
  initialMinPlayers: number;
  initialMaxPlayers: number;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [status, setStatus] = useState(initialStatus);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [gameKey, setGameKey] = useState<string | null>(initialGameKey);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [gameExpanded, setGameExpanded] = useState(false);
  const [endedGameSnapshot, setEndedGameSnapshot] = useState<FlappySnapshot | null>(initialGameSnapshot);
  const [endedFleetSnapshot, setEndedFleetSnapshot] = useState<FleetSnapshot | null>(initialFleetSnapshot);
  const [endedOAnQuanSnapshot, setEndedOAnQuanSnapshot] = useState<OAnQuanSnapshot | null>(initialOAnQuanSnapshot);
  const [endedChessSnapshot, setEndedChessSnapshot] = useState<ChessSnapshot | null>(initialChessSnapshot);
  const [minPlayers, setMinPlayers] = useState(initialMinPlayers);
  const [maxPlayers, setMaxPlayers] = useState(initialMaxPlayers);
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  const [pendingGameKey, setPendingGameKey] = useState<string | null>(null);
  const [gamePickerConfirming, setGamePickerConfirming] = useState(false);
  const [opponentLeftNotice, setOpponentLeftNotice] = useState<OpponentLeftNotice | null>(null);

  useEffect(() => {
    if (!gamePickerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [gamePickerOpen]);

  useEffect(() => {
    let cancelled = false;
    let activeSocket: Socket | null = null;

    async function connectSocket() {
      const response = await fetch("/api/socket-token");
      const payload = await response.json();
      if (cancelled || !response.ok) {
        setMessage(payload.error || "Could not connect to realtime server.");
        return;
      }
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
      if (!socketUrl) {
        setMessage("Missing NEXT_PUBLIC_SOCKET_URL. Set it to the Socket.IO server URL.");
        return;
      }
      const nextSocket = io(socketUrl, {
        auth: { token: payload.token }
      });
      activeSocket = nextSocket;
      setSocket(nextSocket);
      nextSocket.on("connect", () => {
        setConnected(true);
        setMessage("");
        nextSocket.emit("room:join", { roomId });
      });
      nextSocket.on("disconnect", () => setConnected(false));
      nextSocket.on("connect_error", (error) => {
        setConnected(false);
        setMessage(
          `Could not connect to realtime server at ${socketUrl}. Check NEXT_PUBLIC_SOCKET_URL, Render APP_ORIGIN, and matching SESSION_SECRET. ${error.message ? `(${error.message})` : ""}`
        );
      });
      const applySnapshot = (snapshot: Snapshot) => {
        if (snapshot.roomId !== roomId) return;
        setMessage("");
        setMembers(snapshot.members);
        setStatus(snapshot.status);
        setGameKey(snapshot.room?.game_key || null);
        setMinPlayers(snapshot.room?.min_players || 1);
        setMaxPlayers(snapshot.room?.max_players || 12);
        if (snapshot.status !== "ended") {
          setEndedGameSnapshot(null);
          setEndedFleetSnapshot(null);
          setEndedOAnQuanSnapshot(null);
          setEndedChessSnapshot(null);
        }
        setPendingAction(null);
      };
      nextSocket.on("room:joined", applySnapshot);
      nextSocket.on("room:members_updated", applySnapshot);
      nextSocket.on("room:status_updated", applySnapshot);
      nextSocket.on("room:error", ({ message: errorMessage }: { message: string }) => {
        setPendingAction(null);
        setMessage(errorMessage);
      });
      nextSocket.on("room:closed", () => {
        setMessage("Host left. Room closed.");
        router.push("/dashboard");
        router.refresh();
      });
      nextSocket.on("room:opponent_left", ({ message, action }: OpponentLeftNotice) => {
        setPendingAction(null);
        setGameExpanded(false);
        setOpponentLeftNotice({ message, action });
      });
    }

    connectSocket();

    return () => {
      cancelled = true;
      activeSocket?.disconnect();
    };
  }, [roomId, router]);

  async function leaveRoom() {
    if (pendingAction) return;
    setPendingAction("leave");
    if (socket?.connected) {
      socket.emit("room:leave", { roomId });
    } else {
      await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
    }
    router.push("/dashboard");
    router.refresh();
  }

  function acknowledgeOpponentLeft() {
    const action = opponentLeftNotice?.action;
    setOpponentLeftNotice(null);
    if (action === "redirect_dashboard") {
      router.push("/dashboard");
    }
    router.refresh();
  }

  function closeGamePicker() {
    setGamePickerOpen(false);
    setGamePickerConfirming(false);
  }

  async function chooseGame(nextGameKey: string) {
    if (!nextGameKey || gamePickerConfirming) return;
    setGamePickerConfirming(true);
    setMessage("");
    setGameKey(nextGameKey);
    socket?.emit("room:select_game", { roomId, gameKey: nextGameKey });

    const response = await fetch(`/api/rooms/${roomId}/game`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameKey: nextGameKey })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "Could not choose game.");
      setGamePickerConfirming(false);
      return;
    }
    setGameKey(payload.gameKey);
    setMinPlayers(payload.minPlayers || minPlayers);
    setMaxPlayers(payload.maxPlayers || maxPlayers);
    closeGamePicker();
    router.refresh();
  }

  function emitAction(action: string, eventName: string) {
    if (pendingAction) return;
    setPendingAction(action);
    socket?.emit(eventName, { roomId });
  }

  const markGameEnded = useCallback(() => {
    setStatus("ended");
    setPendingAction(null);
  }, []);

  const currentMember = members.find((member) => member.userId === currentUserId);
  const lobbyMembers = members.filter((member) => member.participationStatus === "lobby");
  const activeMembers = members.filter((member) => member.participationStatus !== "waiting_next_round");
  const unreadyPlayers = members.filter((member) => member.role === "player" && member.participationStatus === "lobby" && !member.ready);
  const selectedGame = GAME_CATALOG.find((game) => game.id === gameKey);
  const displayLimits = roomLimits(gameKey, minPlayers, maxPlayers);
  const effectiveMinPlayers = displayLimits.minPlayers;
  const effectiveMaxPlayers = displayLimits.maxPlayers;
  const hasEnoughPlayers = lobbyMembers.length >= effectiveMinPlayers;
  const canStart = isHost && status === "waiting" && Boolean(selectedGame) && hasEnoughPlayers && lobbyMembers.length <= effectiveMaxPlayers && unreadyPlayers.length === 0;
  const playerCountValue = displayLimits.hasSelectedGame ? `${activeMembers.length}/${effectiveMaxPlayers}` : `${activeMembers.length}`;
  const playerCountBadgeLabel = displayLimits.hasSelectedGame
    ? `${activeMembers.length}/${effectiveMaxPlayers} players`
    : `${activeMembers.length} ${activeMembers.length === 1 ? "player" : "players"}`;
  const isLateJoiner = currentMember?.participationStatus === "waiting_next_round";
  const isFlappyActivePlayer = (status === "playing" || status === "ended") && gameKey === "flappy-rush" && currentMember?.participationStatus === "active_game";
  const isFleetActivePlayer = (status === "playing" || status === "ended") && gameKey === "fleet-duel" && currentMember?.participationStatus === "active_game";
  const isOAnQuanActivePlayer = (status === "playing" || status === "ended") && gameKey === "o-an-quan" && currentMember?.participationStatus === "active_game";
  const isChessActivePlayer = (status === "playing" || status === "ended") && gameKey === "chess" && currentMember?.participationStatus === "active_game";
  const isWatchTogetherActivePlayer = status === "playing" && gameKey === "watch-together" && currentMember?.participationStatus === "active_game";
  const isGameLobby = status === "waiting" && Boolean(gameKey);
  const startButton = isHost && status === "waiting" ? (
    <Button disabled={!canStart || Boolean(pendingAction)} onClick={() => emitAction("start", "room:start_game")}>
      <Play size={18} /> {pendingAction === "start" ? "Starting..." : "Start Game"}
    </Button>
  ) : null;
  const startHint = isHost && status === "waiting" ? (
    <>
      {!gameKey && <p className="text-sm font-bold text-slate-500">Choose a game before starting.</p>}
      {gameKey && !hasEnoughPlayers && <p className="text-sm font-bold text-slate-500">Need {effectiveMinPlayers} players to start.</p>}
      {gameKey && hasEnoughPlayers && unreadyPlayers.length > 0 && <p className="text-sm font-bold text-slate-500">Waiting for all players to be ready.</p>}
    </>
  ) : null;
  const readyButton = !isHost && status === "waiting" && currentMember?.participationStatus === "lobby" ? (
    <Button disabled={Boolean(pendingAction)} variant={currentMember.ready ? "secondary" : "primary"} onClick={() => emitAction("ready", "room:toggle_ready")}>
      {pendingAction === "ready" ? "Updating..." : currentMember.ready ? "Unready" : "Ready"}
    </Button>
  ) : null;
  const leaveButton = (
    <Button variant="secondary" disabled={Boolean(pendingAction)} onClick={leaveRoom}>
      <LogOut size={18} /> {pendingAction === "leave" ? "Leaving..." : "Leave room"}
    </Button>
  );
  const displayReady = (member: Member) => {
    if (status === "waiting" && member.role === "host" && member.userId === currentUserId && connected) return true;
    return member.ready;
  };

  return (
    <>
      <header className="mb-5 rounded-[2rem] bg-white/70 p-[clamp(12px,4vw,20px)]">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black uppercase text-[#ff7a90]">{selectedGame?.name || "No game selected"}</p>
            <h1 className="mt-1 text-[clamp(1.5rem,6vw,1.875rem)] font-black leading-tight">{roomName}</h1>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {titleLabel(status)} · {hasPassword ? "Password Room" : "Public Room"}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {roomCode && <div className="rounded-3xl bg-sky-100 px-[clamp(10px,3vw,20px)] py-2 text-center text-sm font-black text-sky-800">Code {roomCode}</div>}
            <div className="rounded-3xl bg-[#ffcf5a] px-[clamp(10px,3vw,20px)] py-2 text-center text-sm font-black">{playerCountBadgeLabel}</div>
          </div>
        </div>
      </header>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_24rem]">
      <section className="min-h-[22rem] min-w-0 overflow-hidden rounded-[2rem] bg-white/88 p-[clamp(12px,4vw,20px)] shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-black text-sky-700">
            {connected ? "Connected" : "Connecting..."}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-700">{titleLabel(status)}</span>
        </div>
        {gamePickerOpen && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Choose game">
            <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
              <div className="shrink-0 border-b border-slate-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-[#ff7a90]">Choose game</p>
                    <h2 className="text-2xl font-black text-slate-900">Pick the room game</h2>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={closeGamePicker}
                      aria-label="Close game picker"
                      className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                    >
                      <X size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={!pendingGameKey || gamePickerConfirming}
                      onClick={() => { if (pendingGameKey) chooseGame(pendingGameKey); }}
                      aria-label="Confirm game selection"
                      className="grid size-7 place-items-center rounded-full bg-[#ff7a90] text-white shadow-sm transition hover:bg-[#ff6070] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  {GAME_CATALOG.map((game) => {
                    const selected = game.id === pendingGameKey;
                    return (
                      <button
                        key={game.id}
                        type="button"
                        disabled={Boolean(pendingAction)}
                        onClick={() => setPendingGameKey(game.id)}
                        className={`rounded-[1.75rem] p-3 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${
                          selected ? "bg-rose-50 ring-rose-200" : "bg-white ring-slate-100"
                        }`}
                      >
                        <GameOptionVisual gameId={game.id} />
                        <div className="mt-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-900">{game.name}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-500">{game.description}</p>
                            {"turnDurationLabel" in game && <p className="mt-1 text-xs font-bold text-slate-400">{game.turnDurationLabel}</p>}
                            <p className="mt-2 text-xs font-black text-slate-400">
                              {game.minPlayers}-{game.maxPlayers} players
                            </p>
                          </div>
                          <span className={`grid size-8 shrink-0 place-items-center rounded-full ${selected ? "bg-[#ff7a90] text-white" : "bg-slate-100 text-slate-400"}`}>
                            {selected ? <Check size={16} /> : <Gamepad2 size={16} />}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        {opponentLeftNotice && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Opponent left room">
            <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl">
              <p className="text-2xl font-black text-slate-900">Game ended</p>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-500">{opponentLeftNotice.message}</p>
              <Button className="mt-5 w-full justify-center" onClick={acknowledgeOpponentLeft}>
                OK
              </Button>
            </div>
          </div>
        )}
        {message && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{message}</p>}
        {isLateJoiner && (
          <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700">
            Game is in progress. You&apos;ll join when the next round starts.
          </p>
        )}
        <div className="mt-4 rounded-[1.5rem] bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-500">Selected game · Players {playerCountValue}</p>
          {isHost && status === "waiting" ? (
            <button
              type="button"
              disabled={Boolean(pendingAction)}
              onClick={() => { setGamePickerOpen(true); setPendingGameKey(gameKey); }}
              className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left font-bold outline-none transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-xl">{selectedGame?.icon || "🎮"}</span>
              <span className="min-w-0">
                <span className="block truncate text-slate-900">{selectedGame?.name || "Choose a game"}</span>
                <span className="block truncate text-xs text-slate-500">{selectedGame?.description || "Open game catalog"}</span>
              </span>
            </button>
          ) : (
            <p className="mt-1 text-xl font-black text-slate-900">{selectedGame?.name || "No game selected yet"}</p>
          )}
        </div>
        {isFlappyActivePlayer ? (
          <FlappyRushGame
            roomId={roomId}
            currentUserId={currentUserId}
            isHost={isHost}
            onGameEnd={markGameEnded}
            expanded={gameExpanded}
            onToggleExpanded={() => setGameExpanded((value) => !value)}
            initialSnapshot={endedGameSnapshot}
            roomStatus={status === "ended" ? "ended" : "playing"}
          />
        ) : isFleetActivePlayer ? (
          <FleetDuelGame
            roomId={roomId}
            currentUserId={currentUserId}
            isHost={isHost}
            onGameEnd={markGameEnded}
            expanded={gameExpanded}
            onToggleExpanded={() => setGameExpanded((value) => !value)}
            initialSnapshot={endedFleetSnapshot}
            roomStatus={status === "ended" ? "ended" : "playing"}
          />
        ) : isOAnQuanActivePlayer ? (
          <OAnQuanGame
            roomId={roomId}
            currentUserId={currentUserId}
            isHost={isHost}
            onGameEnd={markGameEnded}
            expanded={gameExpanded}
            onToggleExpanded={() => setGameExpanded((value) => !value)}
            initialSnapshot={endedOAnQuanSnapshot}
            roomStatus={status === "ended" ? "ended" : "playing"}
          />
        ) : isChessActivePlayer ? (
          <ChessGame
            roomId={roomId}
            currentUserId={currentUserId}
            isHost={isHost}
            onGameEnd={markGameEnded}
            expanded={gameExpanded}
            onToggleExpanded={() => setGameExpanded((value) => !value)}
            initialSnapshot={endedChessSnapshot}
            roomStatus={status === "ended" ? "ended" : "playing"}
          />
        ) : isWatchTogetherActivePlayer ? (
          <WatchTogetherGame
            roomId={roomId}
            currentUserId={currentUserId}
            isHost={isHost}
            expanded={gameExpanded}
            onToggleExpanded={() => setGameExpanded((value) => !value)}
          />
        ) : isGameLobby ? (
          <GameFullscreenShell
            expanded={gameExpanded}
            onToggleExpanded={() => setGameExpanded((value) => !value)}
            header={
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-500">Game stage</p>
                <p className="truncate text-lg font-black text-slate-900">{selectedGame?.name || "Selected game"}</p>
              </div>
            }
            footer={
              <div className="grid justify-items-center gap-3">
                <p className="text-center text-sm font-semibold text-slate-500">
                  {gameKey === "flappy-rush" ? "Tap, click, or press Space once the round starts." : "Prepare the room, then start when everyone is ready."}
                </p>
                {leaveButton}
              </div>
            }
          >
            <div className="relative grid min-h-[18rem] flex-1 place-items-center overflow-hidden rounded-[1.5rem] bg-sky-100 p-[clamp(12px,4vw,20px)] text-center shadow-inner max-[700px]:landscape:min-h-[14rem]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.75),transparent_24%),radial-gradient(circle_at_80%_25%,rgba(255,255,255,0.65),transparent_22%)]" />
              <div className="relative grid justify-items-center gap-3">
                <p className="text-[clamp(1.5rem,5vw,1.875rem)] font-black text-slate-900">{gameKey === "flappy-rush" ? "Ready to flap?" : "Ready to play?"}</p>
                <p className="max-w-md text-slate-500">
                  {gameKey === "flappy-rush"
                    ? "Start the round when everyone is ready. Full screen is available before the game begins."
                    : "Start the round when the room has enough players and everyone is ready."}
                </p>
                {startButton}
                {readyButton}
                {startHint}
              </div>
            </div>
          </GameFullscreenShell>
        ) : (
          <div className="grid min-h-[16rem] place-items-center text-center">
            <div>
              <p className="text-3xl font-black text-slate-900">{status === "playing" ? "Game will be added later" : "Waiting lobby"}</p>
              <p className="mt-2 text-slate-500">Room lifecycle is ready for the next game module.</p>
            </div>
          </div>
        )}
        <div className="flex w-full flex-wrap items-center gap-3">
          {!isGameLobby && startButton}
          {!isGameLobby && <div className="self-center">{startHint}</div>}
          {isHost && (status === "playing" || status === "ended") && !isFlappyActivePlayer && !isWatchTogetherActivePlayer && (
            <Button disabled={Boolean(pendingAction)} onClick={() => emitAction("back-to-lobby", "room:back_to_lobby")}>
              <RotateCcw size={18} /> {pendingAction === "back-to-lobby" ? "Returning..." : "Back to Lobby"}
            </Button>
          )}
          {!isGameLobby && readyButton}
          {!isGameLobby && <div className="flex w-full justify-center">{leaveButton}</div>}
        </div>
      </section>
      <aside className="rounded-[2rem] bg-white/88 p-[clamp(12px,4vw,20px)] shadow-sm">
        <h2 className="mb-4 text-lg font-black">Room members</h2>
        <div className="grid gap-3">
          {members.map((member) => (
            <div key={member.userId} className="grid grid-cols-[auto_1fr] gap-3 rounded-3xl bg-slate-50 p-3 sm:flex sm:items-center">
              <Avatar displayName={member.displayName} username={member.username} avatarUrl={member.avatarUrl} />
              <div className="min-w-0">
                <p className="break-words font-black leading-tight">{member.displayName}</p>
                <p className="mt-1 flex flex-wrap gap-x-1 gap-y-0.5 text-sm font-bold leading-snug text-slate-500">
                  <span>@{member.username}</span>
                  <span>·</span>
                  <span>{titleLabel(member.role)}</span>
                  <span>·</span>
                  <span>{titleLabel(member.participationStatus)}</span>
                </p>
              </div>
              <span className={`col-span-2 w-fit rounded-full px-3 py-1 text-xs font-black sm:col-span-1 sm:ml-auto ${status === "waiting" && displayReady(member) ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                {status === "waiting" ? (member.role === "host" ? (displayReady(member) ? "Host Ready" : "Host Not Ready") : displayReady(member) ? "Ready" : "Not Ready") : titleLabel(status)}
              </span>
            </div>
          ))}
        </div>
      </aside>
    </div>
    </>
  );
}


