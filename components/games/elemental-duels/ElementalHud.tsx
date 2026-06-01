"use client";

import type { ElementalSnapshot } from "@/lib/games/elemental-duels/types";

export function ElementalHud({ snapshot, currentUserId, connected }: { snapshot: ElementalSnapshot; currentUserId: string; connected: boolean }) {
  const you = snapshot.players[currentUserId];
  const opponent = Object.values(snapshot.players).find((player) => player.userId !== currentUserId);
  const countdown = snapshot.status === "countdown" ? Math.max(0, Math.ceil((snapshot.countdownEndsAt - snapshot.serverTime) / 1000)) : null;

  return (
    <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${connected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
        {connected ? "Connected" : "Reconnecting"}
      </span>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl bg-white px-3 py-2 text-sm font-black shadow-sm">
          {you?.displayName || "You"} · {you?.baseHp ?? 0} HP · {you?.gold ?? 0} gold
        </div>
        <div className="rounded-2xl bg-white px-3 py-2 text-sm font-black shadow-sm">
          {opponent?.displayName || "Opponent"} · {opponent?.baseHp ?? 0} HP · {opponent?.monsters.length ?? 0} mobs
        </div>
      </div>
      <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
        {countdown ? `Start in ${countdown}` : snapshot.status}
      </span>
    </div>
  );
}
