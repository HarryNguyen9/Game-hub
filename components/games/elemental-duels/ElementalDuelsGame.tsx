"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { GameFullscreenShell } from "@/components/games/game-fullscreen-shell";
import { GameResultDialog } from "@/components/games/game-result-dialog";
import { ToastPopup } from "@/components/ui/toast-popup";
import { ELEMENTAL_CONFIG } from "@/lib/games/elemental-duels/config";
import type { ElementalSnapshot } from "@/lib/games/elemental-duels/types";
import { ElementalContextMenu, type ElementalSelection } from "./ElementalContextMenu";
import { ElementalDuelsPhaser } from "./ElementalDuelsPhaser";
import { ElementalHud } from "./ElementalHud";
import { ElementalOpponentPanel } from "./ElementalOpponentPanel";
import { useElementalDuelsSocket } from "./useElementalDuelsSocket";

export function ElementalDuelsGame({
  roomId,
  currentUserId,
  isHost,
  onGameEnd,
  expanded,
  onToggleExpanded,
  initialSnapshot,
  roomStatus
}: {
  roomId: string;
  currentUserId: string;
  isHost: boolean;
  onGameEnd?: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  initialSnapshot?: ElementalSnapshot | null;
  roomStatus: "playing" | "ended";
}) {
  const { snapshot, error, connected, buildTower, upgradeTower, sellTower, setTargetMode, selectSendElement, selectMonsterType, backToLobby } = useElementalDuelsSocket(roomId, onGameEnd, initialSnapshot, roomStatus === "ended");
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [selection, setSelection] = useState<ElementalSelection | null>(null);
  const [fieldBounds, setFieldBounds] = useState<{ width: number; height: number }>({ width: ELEMENTAL_CONFIG.worldWidth, height: ELEMENTAL_CONFIG.worldHeight });
  const [returning, setReturning] = useState(false);
  const [muted, setMuted] = useState(() => (typeof window === "undefined" ? true : window.localStorage.getItem("elemental-muted") !== "false"));
  const previousBaseHpRef = useRef<number | null>(null);
  const previousTowerCountRef = useRef(0);
  const previousStatusRef = useRef<string | null>(null);
  const winner = useMemo(() => (snapshot?.winnerUserId ? snapshot.players[snapshot.winnerUserId] : null), [snapshot]);
  const you = snapshot?.players[currentUserId] || null;
  const opponent = snapshot ? Object.values(snapshot.players).find((player) => player.userId !== currentUserId) || null : null;
  const showDebugStats = process.env.NODE_ENV !== "production";
  const debugStats = useMemo(() => {
    if (!snapshot || !you) return null;
    const totalMonsters = Object.values(snapshot.players).reduce((sum, player) => sum + player.monsters.length, 0);
    const totalTowers = Object.values(snapshot.players).reduce((sum, player) => sum + player.towers.length, 0);
    const dpsEstimate = you.towers.reduce((sum, tower) => {
      const definition = snapshot.catalog.towers.find((item) => item.id === tower.towerType);
      if (!definition) return sum;
      const scale = definition.levelScale[Math.max(0, tower.level - 1)] || 1;
      return sum + (definition.damage * scale * 1000) / definition.fireRateMs;
    }, 0);
    return { totalMonsters, totalTowers, dpsEstimate };
  }, [snapshot, you]);

  const playTone = useCallback((type: "build" | "hit" | "end") => {
    if (muted || typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type === "hit" ? "sawtooth" : "sine";
    oscillator.frequency.value = type === "build" ? 520 : type === "hit" ? 160 : 720;
    gain.gain.value = 0.035;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (type === "end" ? 0.24 : 0.1));
    oscillator.addEventListener("ended", () => void context.close());
  }, [muted]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("elemental-muted", String(muted));
  }, [muted]);

  useEffect(() => {
    if (!snapshot || !you) return;
    const previousHp = previousBaseHpRef.current;
    if (previousHp !== null && you.baseHp < previousHp) playTone("hit");
    previousBaseHpRef.current = you.baseHp;

    if (you.towers.length > previousTowerCountRef.current) playTone("build");
    previousTowerCountRef.current = you.towers.length;

    if (snapshot.status === "ended" && previousStatusRef.current !== "ended") playTone("end");
    previousStatusRef.current = snapshot.status;
  }, [playTone, snapshot, you]);

  useEffect(() => {
    const element = fieldRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect;
      setFieldBounds({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!snapshot || !selection || !you) return;
    let shouldClose = false;
    if (snapshot.status !== "playing") {
      shouldClose = true;
    }
    if (selection.kind === "tower" && !you.towers.some((tower) => tower.id === selection.towerId)) shouldClose = true;
    if (selection.kind === "tile" && you.towers.some((tower) => Math.hypot(tower.x - selection.point.x, tower.y - selection.point.y) < 20)) shouldClose = true;
    if (selection.kind === "obstacle" && snapshot.map.obstacles.some((obstacle) => obstacle.id === selection.obstacleId && obstacle.cleared)) shouldClose = true;
    if (!shouldClose) return;
    const timer = window.setTimeout(() => setSelection(null), 0);
    return () => window.clearTimeout(timer);
  }, [selection, snapshot, you]);

  function handleBuild(towerType: string, x: number, y: number) {
    playTone("build");
    buildTower(towerType, x, y);
  }

  function returnToLobby() {
    if (returning) return;
    setReturning(true);
    backToLobby();
  }

  const menuSelection = selection
    ? {
        ...selection,
        screen: {
          x: (selection.point.x / ELEMENTAL_CONFIG.worldWidth) * fieldBounds.width,
          y: (selection.point.y / ELEMENTAL_CONFIG.worldHeight) * fieldBounds.height
        }
      }
    : null;

  if (!snapshot) {
    return (
      <div className="mt-4 grid min-h-[22rem] place-items-center rounded-[1.5rem] bg-orange-50 text-center font-black text-slate-600">
        {connected ? "Loading Elemental Duels..." : "Connecting to Elemental Duels..."}
      </div>
    );
  }

  return (
    <GameFullscreenShell
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
      header={
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-black">Elemental Duels 2D</h3>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-100"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? "Unmute Elemental Duels" : "Mute Elemental Duels"}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {muted ? "Muted" : "Sound"}
          </button>
          <p className="text-sm font-bold text-slate-500">{snapshot.map.label} · {snapshot.status}</p>
        </div>
      }
    >
      <ToastPopup message={error} />
      <GameResultDialog
        open={snapshot.status === "ended"}
        title={winner ? `${winner.displayName} wins!` : "Draw"}
        subtitle={winner?.userId === currentUserId ? "Victory" : winner ? "Defeat" : "The duel is over."}
        details={
          <div className="grid grid-cols-2 gap-2 text-sm font-black">
            <span className="rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-700">You {you?.baseHp ?? 0} HP</span>
            <span className="rounded-2xl bg-rose-50 px-3 py-2 text-rose-700">Rival {opponent?.baseHp ?? 0} HP</span>
          </div>
        }
        isHost={isHost}
        returning={returning}
        onBackToLobby={returnToLobby}
        tone="orange"
        icon={<span className="text-2xl">🔥</span>}
      />
      <ElementalHud snapshot={snapshot} currentUserId={currentUserId} connected={connected} />
      <div className={`grid gap-4 ${showDebugStats && debugStats ? "xl:grid-cols-[1fr_19rem]" : ""}`}>
        <div ref={fieldRef} className="relative">
          <ElementalDuelsPhaser snapshot={snapshot} currentUserId={currentUserId} onSelect={setSelection} />
          <ElementalOpponentPanel snapshot={snapshot} currentUserId={currentUserId} onSelectElement={selectSendElement} onSelectMonster={selectMonsterType} />
          <ElementalContextMenu
            snapshot={snapshot}
            currentUserId={currentUserId}
            selection={menuSelection}
            bounds={fieldBounds}
            onBuild={handleBuild}
            onUpgrade={upgradeTower}
            onSell={sellTower}
            onTargetMode={setTargetMode}
            onClose={() => setSelection(null)}
          />
        </div>
        {showDebugStats && debugStats && (
          <div className="grid content-start gap-4">
            <div className="rounded-3xl bg-slate-900 p-4 text-xs font-bold text-slate-100">
              <p className="mb-2 text-sm font-black text-white">Dev balance</p>
              <p>Monsters: {debugStats.totalMonsters}</p>
              <p>Towers: {debugStats.totalTowers}</p>
              <p>Your DPS est: {debugStats.dpsEstimate.toFixed(1)}</p>
              <p>Income: {ELEMENTAL_CONFIG.passiveIncome}g / {(ELEMENTAL_CONFIG.passiveIncomeMs / 1000).toFixed(1)}s</p>
              <p>Base HP: {you?.baseHp ?? 0} / {opponent?.baseHp ?? 0}</p>
            </div>
          </div>
        )}
      </div>
    </GameFullscreenShell>
  );
}
