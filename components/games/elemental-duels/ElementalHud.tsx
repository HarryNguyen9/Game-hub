"use client";

import { ELEMENTAL_CONFIG } from "@/lib/games/elemental-duels/config";
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
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{you?.displayName || "You"}</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">{you?.gold ?? 0}g</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-rose-100">
            <div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.max(0, Math.min(100, ((you?.baseHp ?? 0) / ELEMENTAL_CONFIG.baseHp) * 100))}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{you?.baseHp ?? 0} HP</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2 text-sm font-black shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{opponent?.displayName || "Opponent"}</span>
            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-cyan-700">{opponent?.monsters.length ?? 0} mobs</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-100">
            <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max(0, Math.min(100, ((opponent?.baseHp ?? 0) / ELEMENTAL_CONFIG.baseHp) * 100))}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{opponent?.baseHp ?? 0} HP</p>
        </div>
      </div>
      <span className="w-fit rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
        {countdown ? `Start in ${countdown}` : snapshot.status}
      </span>
    </div>
  );
}
