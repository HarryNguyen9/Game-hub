"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CreateRoomForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        hasPassword,
        password: hasPassword ? form.get("password") : undefined
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not create room.");
      setCreating(false);
      return;
    }
    router.push(`/rooms/${payload.roomId}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-[2rem] bg-white/88 p-5 shadow-sm">
      <label className="grid gap-2 text-sm font-bold">
        Room name
        <input name="name" required className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-300" />
      </label>
      <label className="rounded-2xl bg-slate-50 p-4 text-sm font-bold">
        <input className="mr-2" type="checkbox" name="hasPassword" checked={hasPassword} onChange={(event) => setHasPassword(event.target.checked)} />
        Require room password
      </label>
      {hasPassword && (
        <label className="grid gap-2 text-sm font-bold">
          Room password
          <input name="password" type="password" required placeholder="Enter a room password" className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-300" />
        </label>
      )}
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
      <Button disabled={creating}>{creating ? "Creating..." : "Create room"}</Button>
    </form>
  );
}

export function JoinRoomForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [roomInfo, setRoomInfo] = useState<{
    name: string;
    status: "waiting" | "playing" | "ended";
    hasPassword: boolean;
    playerCount: number;
  } | null>(null);

  useEffect(() => {
    if (roomCode.length !== 4) return;

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setChecking(true);
      const response = await fetch(`/api/rooms/lookup?roomCode=${roomCode}`);
      const payload = await response.json();
      if (cancelled) return;
      setChecking(false);
      if (!response.ok) {
        setError(payload.error || "Room not found.");
        return;
      }
      setRoomInfo(payload.room);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [roomCode]);

  function updateRoomCode(value: string) {
    setRoomCode(value.replace(/\D/g, "").slice(0, 4));
    setRoomInfo(null);
    setError("");
    setPassword("");
    setChecking(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (joining) return;
    setError("");
    if (!roomInfo) {
      setError("Enter a valid 4-digit room code first.");
      return;
    }

    setJoining(true);
    const response = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, password: roomInfo.hasPassword ? password : undefined })
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "Could not join room.");
      setJoining(false);
      return;
    }
    router.push(`/rooms/${payload.roomId}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-[2rem] bg-white/88 p-5 shadow-sm">
      <label className="grid gap-2 text-sm font-bold">
        Room code
        <input
          value={roomCode}
          onChange={(event) => updateRoomCode(event.target.value)}
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="1234"
          className="rounded-2xl border border-slate-200 px-4 py-3 text-lg font-black tracking-[0.35em] outline-none focus:border-rose-300"
        />
      </label>
      {checking && <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700">Checking room...</p>}
      {roomInfo && (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
          <p className="text-slate-900">{roomInfo.name}</p>
          <p className="mt-1">
            {roomInfo.status === "playing" ? "In game" : roomInfo.status === "ended" ? "Ended" : "Waiting"} · {roomInfo.playerCount} players · {roomInfo.hasPassword ? "Password required" : "Public room"}
          </p>
        </div>
      )}
      {roomInfo?.hasPassword && (
        <label className="grid gap-2 text-sm font-bold">
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-300"
          />
        </label>
      )}
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
      <Button disabled={!roomInfo || checking || joining}>{joining ? "Joining..." : roomInfo?.hasPassword ? "Join locked room" : "Join room"}</Button>
    </form>
  );
}
