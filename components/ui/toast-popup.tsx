"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "error" | "success" | "info";

export function ToastPopup({
  message,
  tone = "error",
  onDismiss,
  className = ""
}: {
  message?: string | null;
  tone?: ToastTone;
  onDismiss?: () => void;
  className?: string;
}) {
  const [visible, setVisible] = useState(Boolean(message));
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const showTimer = window.setTimeout(() => {
      setVisible(Boolean(message));
    }, 0);
    if (!message) {
      return () => window.clearTimeout(showTimer);
    }
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      onDismissRef.current?.();
    }, tone === "error" ? 3200 : 2400);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [message, tone]);

  if (!message || !visible) return null;

  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertCircle;

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "pointer-events-none fixed left-1/2 top-4 z-[90] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2",
        "animate-[toast-pop_260ms_ease-out] rounded-3xl border bg-white/95 p-3 shadow-2xl backdrop-blur",
        tone === "error" && "border-red-100 text-red-700",
        tone === "success" && "border-emerald-100 text-emerald-700",
        tone === "info" && "border-sky-100 text-sky-700",
        className
      )}
    >
      <style>{`
        @keyframes toast-pop {
          from { opacity: 0; transform: translate(-50%, -10px) scale(0.97); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>
      <div className="flex items-start gap-3">
        <span
          className={clsx(
            "grid size-9 shrink-0 place-items-center rounded-2xl",
            tone === "error" && "bg-red-50",
            tone === "success" && "bg-emerald-50",
            tone === "info" && "bg-sky-50"
          )}
        >
          <Icon size={18} />
        </span>
        <p className="min-w-0 flex-1 py-1 text-sm font-black leading-5">{message}</p>
        <button
          type="button"
          aria-label="Dismiss message"
          className="pointer-events-auto grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          onClick={() => {
            setVisible(false);
            onDismissRef.current?.();
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
