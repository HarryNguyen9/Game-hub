"use client";

import type { ReactNode } from "react";
import { RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GameResultDialog({
  open,
  title,
  subtitle,
  details,
  isHost,
  returning,
  onBackToLobby,
  tone = "amber",
  icon
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  details?: ReactNode;
  isHost: boolean;
  returning?: boolean;
  onBackToLobby?: () => void;
  tone?: "amber" | "rose" | "cyan" | "indigo" | "orange";
  icon?: ReactNode;
}) {
  if (!open) return null;

  const toneClass = {
    amber: "bg-amber-100 text-amber-600",
    rose: "bg-rose-100 text-rose-600",
    cyan: "bg-cyan-100 text-cyan-700",
    indigo: "bg-indigo-100 text-indigo-700",
    orange: "bg-orange-100 text-orange-700"
  }[tone];

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-sm rounded-[2rem] bg-white p-5 text-center shadow-2xl ring-1 ring-white/70">
        <div className={`mx-auto grid size-14 place-items-center rounded-full ${toneClass}`}>
          {icon || <Trophy size={24} />}
        </div>
        <p className="mt-3 text-2xl font-black text-slate-950">{title}</p>
        {subtitle && <p className="mt-2 text-sm font-black text-slate-500">{subtitle}</p>}
        {details && <div className="mt-4">{details}</div>}
        {isHost ? (
          <Button className="mt-5 w-full justify-center" disabled={returning} onClick={onBackToLobby}>
            <RotateCcw size={18} /> {returning ? "Returning..." : "Back to Lobby"}
          </Button>
        ) : (
          <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">Waiting for host to return to lobby.</p>
        )}
      </div>
    </div>
  );
}
