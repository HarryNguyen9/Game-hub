"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { LogOut, Maximize2, Minimize2, Play, RotateCcw } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FlappyRushGame } from "@/components/games/flappy-rush/FlappyRushGame";
import { FleetDuelGame } from "@/components/games/fleet-duel/FleetDuelGame";
import { GAME_CATALOG } from "@/lib/constants";
import type { FlappySnapshot } from "@/lib/games/flappy-rush/types";
import type { FleetSnapshot } from "@/lib/games/fleet-duel/types";

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

function titleLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function RoomClient({
  roomId,
  initialMembers,
  initialStatus,
  isHost,
  currentUserId,
  initialGameKey,
  initialGameSnapshot,
  initialFleetSnapshot,
  initialMinPlayers,
  initialMaxPlayers
}: {
  roomId: string;
  initialMembers: Member[];
  initialStatus: RoomStatus;
  isHost: boolean;
  currentUserId: string;
  initialGameKey: string | null;
  initialGameSnapshot: FlappySnapshot | null;
  initialFleetSnapshot: FleetSnapshot | null;
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
  const [minPlayers, setMinPlayers] = useState(initialMinPlayers);
  const [maxPlayers, setMaxPlayers] = useState(initialMaxPlayers);

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
        }
        setPendingAction(null);
      };
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
    socket?.emit("room:leave", { roomId });
    await fetch(`/api/rooms/${roomId}`, { method: "DELETE" });
    router.push("/dashboard");
    router.refresh();
  }

  async function chooseGame(nextGameKey: string) {
    if (!nextGameKey || pendingAction) return;
    setPendingAction("choose-game");
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
      setPendingAction(null);
      return;
    }
    setGameKey(payload.gameKey);
    setMinPlayers(payload.minPlayers || minPlayers);
    setMaxPlayers(payload.maxPlayers || maxPlayers);
    setPendingAction(null);
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
  const hasEnoughPlayers = lobbyMembers.length >= minPlayers;
  const canStart = isHost && status === "waiting" && Boolean(gameKey) && hasEnoughPlayers && lobbyMembers.length <= maxPlayers && unreadyPlayers.length === 0;
  const selectedGame = GAME_CATALOG.find((game) => game.id === gameKey);
  const isLateJoiner = currentMember?.participationStatus === "waiting_next_round";
  const isFlappyActivePlayer = (status === "playing" || status === "ended") && gameKey === "flappy-rush" && currentMember?.participationStatus === "active_game";
  const isFleetActivePlayer = (status === "playing" || status === "ended") && gameKey === "fleet-duel" && currentMember?.participationStatus === "active_game";
  const isFlappyLobby = status === "waiting" && gameKey === "flappy-rush";
  const startButton = isHost && status === "waiting" ? (
    <Button disabled={!canStart || Boolean(pendingAction)} onClick={() => emitAction("start", "room:start_game")}>
      <Play size={18} /> {pendingAction === "start" ? "Starting..." : "Start Game"}
    </Button>
  ) : null;
  const startHint = isHost && status === "waiting" ? (
    <>
      {!gameKey && <p className="text-sm font-bold text-slate-500">Choose a game before starting.</p>}
      {gameKey && !hasEnoughPlayers && <p className="text-sm font-bold text-slate-500">Need {minPlayers} players to start.</p>}
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
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <section className="min-h-[22rem] rounded-[2rem] bg-white/88 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-black text-sky-700">
            {connected ? "Realtime connected" : "Connecting..."}
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-700">{titleLabel(status)}</span>
        </div>
        {message && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{message}</p>}
        {isLateJoiner && (
          <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700">
            Game is in progress. You&apos;ll join when the next round starts.
          </p>
        )}
        <div className="mt-4 rounded-[1.5rem] bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-500">Selected game · Players {activeMembers.length}/{maxPlayers}</p>
          {isHost && status === "waiting" ? (
            <select
              value={gameKey || ""}
              disabled={Boolean(pendingAction)}
              onChange={(event) => chooseGame(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-rose-300"
            >
              <option value="" disabled>
                Choose a game
              </option>
              {GAME_CATALOG.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
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
            initialSnapshot={endedFleetSnapshot}
            roomStatus={status === "ended" ? "ended" : "playing"}
          />
        ) : isFlappyLobby ? (
          <div className={gameExpanded ? "fixed inset-0 z-50 flex h-dvh flex-col gap-3 overflow-y-auto bg-white p-3" : "relative mt-4 grid gap-4"}>
            <Button
              type="button"
              variant="secondary"
              className="absolute right-4 top-4 z-20 grid size-11 shrink-0 place-items-center rounded-2xl bg-white/92 p-0 shadow-sm"
              onClick={() => setGameExpanded((value) => !value)}
              aria-label={gameExpanded ? "Exit full screen" : "Open full screen"}
              title={gameExpanded ? "Small" : "Full"}
            >
              {gameExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
            <div className="flex flex-col gap-3 rounded-3xl bg-slate-50 px-4 py-3 pr-20 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-500">Game stage</p>
                <p className="text-lg font-black text-slate-900">Flappy Rush</p>
              </div>
            </div>
            <div className="relative grid min-h-[22rem] flex-1 place-items-center overflow-hidden rounded-[1.5rem] bg-sky-100 p-5 text-center shadow-inner max-[700px]:landscape:min-h-[16rem]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.75),transparent_24%),radial-gradient(circle_at_80%_25%,rgba(255,255,255,0.65),transparent_22%)]" />
              <div className="relative grid justify-items-center gap-3">
                <p className="text-3xl font-black text-slate-900">Ready to flap?</p>
                <p className="max-w-md text-slate-500">Start the round when everyone is ready. Full screen is available before the game begins.</p>
                {startButton}
                {readyButton}
                {startHint}
              </div>
            </div>
            <p className="text-center text-sm font-semibold text-slate-500">Tap, click, or press Space once the round starts.</p>
            <div className="flex justify-center">{leaveButton}</div>
          </div>
        ) : (
          <div className="grid min-h-[16rem] place-items-center text-center">
            <div>
              <p className="text-3xl font-black text-slate-900">{status === "playing" ? "Game will be added later" : "Waiting lobby"}</p>
              <p className="mt-2 text-slate-500">Room lifecycle is ready for the next game module.</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {!isFlappyLobby && startButton}
          {!isFlappyLobby && <div className="self-center">{startHint}</div>}
          {isHost && (status === "playing" || status === "ended") && !isFlappyActivePlayer && (
            <Button disabled={Boolean(pendingAction)} onClick={() => emitAction("back-to-lobby", "room:back_to_lobby")}>
              <RotateCcw size={18} /> {pendingAction === "back-to-lobby" ? "Returning..." : "Back to Lobby"}
            </Button>
          )}
          {!isFlappyLobby && readyButton}
          {!isFlappyLobby && leaveButton}
        </div>
      </section>
      <aside className="rounded-[2rem] bg-white/88 p-5 shadow-sm">
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
  );
}
