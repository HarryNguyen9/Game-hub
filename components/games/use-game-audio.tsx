"use client";

import { useCallback, useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GameTone = "flap" | "move" | "turn" | "hit" | "score" | "crash" | "end";

const toneConfig: Record<GameTone, { frequency: number; duration: number; type: OscillatorType; gain: number }> = {
  flap: { frequency: 560, duration: 0.08, type: "sine", gain: 0.035 },
  move: { frequency: 420, duration: 0.09, type: "triangle", gain: 0.032 },
  turn: { frequency: 760, duration: 0.16, type: "sine", gain: 0.035 },
  hit: { frequency: 220, duration: 0.1, type: "square", gain: 0.025 },
  score: { frequency: 880, duration: 0.18, type: "sine", gain: 0.04 },
  crash: { frequency: 130, duration: 0.22, type: "sawtooth", gain: 0.03 },
  end: { frequency: 640, duration: 0.24, type: "triangle", gain: 0.035 }
};

export function useGameAudio(storageKey: string) {
  const [muted, setMuted] = useState(() => (typeof window === "undefined" ? true : window.localStorage.getItem(storageKey) !== "false"));

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(storageKey, String(muted));
  }, [muted, storageKey]);

  const playTone = useCallback((tone: GameTone) => {
    if (muted || typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    try {
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const config = toneConfig[tone];
      oscillator.type = config.type;
      oscillator.frequency.value = config.frequency;
      gain.gain.value = config.gain;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + config.duration);
      oscillator.addEventListener("ended", () => void context.close());
    } catch {
      // Browsers can reject audio before user interaction; gameplay stays unaffected.
    }
  }, [muted]);

  return { muted, setMuted, playTone };
}

export function GameMuteButton({
  muted,
  onToggle,
  label
}: {
  muted: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/92 p-0 shadow-sm"
      onClick={onToggle}
      aria-label={muted ? `Unmute ${label}` : `Mute ${label}`}
      title={muted ? "Unmute" : "Mute"}
    >
      {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
    </Button>
  );
}
