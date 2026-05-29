"use client";

import type { ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GameFullscreenShell({
  expanded,
  onToggleExpanded,
  header,
  children,
  footer,
  className = ""
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={expanded ? "fixed inset-0 z-50 flex h-dvh flex-col gap-3 overflow-y-auto bg-white p-3" : `relative flex flex-1 flex-col gap-4 min-w-0 ${className}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-slate-50 px-4 py-3">
        <div className="min-w-0">{header}</div>
        <Button
          type="button"
          variant="secondary"
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/92 p-0 shadow-sm"
          onClick={onToggleExpanded}
          aria-label={expanded ? "Exit full screen" : "Open full screen"}
          title={expanded ? "Small" : "Full"}
        >
          {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </Button>
      </div>
      {children}
      {footer}
    </div>
  );
}
