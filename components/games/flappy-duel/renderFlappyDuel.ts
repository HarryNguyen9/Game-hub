import type { FlappySnapshot } from "@/lib/games/flappy-duel/types";

type RenderOptions = {
  currentUserId: string;
  previousSnapshot: FlappySnapshot | null;
  currentSnapshot: FlappySnapshot;
  interpolation: number;
  predictedSelfY: number | null;
  lastFlapAt: number;
  lastCrashAt: number | null;
};

const pigAccentColors = ["#ff6f91", "#6c9cff", "#ffcf5a", "#64d6a4", "#b88cff", "#ff9f6e"];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
}

function playerColor(userId: string, index: number) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) hash = (hash * 31 + userId.charCodeAt(i)) % 997;
  return pigAccentColors[(hash + index) % pigAccentColors.length];
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.48)";
  ctx.beginPath();
  ctx.ellipse(x, y, 44 * scale, 16 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 28 * scale, y + 2 * scale, 30 * scale, 13 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 28 * scale, y + 3 * scale, 32 * scale, 14 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPipe(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, top: boolean) {
  if (height <= 0) return;
  const capHeight = 26;
  const bodyGradient = ctx.createLinearGradient(x, 0, x + width, 0);
  bodyGradient.addColorStop(0, "#93e98d");
  bodyGradient.addColorStop(0.55, "#72d96b");
  bodyGradient.addColorStop(1, "#4fbf5b");
  ctx.fillStyle = bodyGradient;
  ctx.strokeStyle = "#37a653";
  ctx.lineWidth = 4;
  roundedRect(ctx, x, y, width, height, 14);
  ctx.fill();
  ctx.stroke();

  const capY = top ? y + height - capHeight : y;
  roundedRect(ctx, x - 9, capY, width + 18, capHeight, 12);
  ctx.fillStyle = "#a8f3a1";
  ctx.fill();
  ctx.stroke();
}

function drawPig(ctx: CanvasRenderingContext2D, options: { x: number; y: number; size: number; color: string; velocity: number; alive: boolean; self: boolean; flapPulse: number }) {
  const { x, y, size, color, velocity, alive, self, flapPulse } = options;
  const squash = self ? flapPulse * 0.12 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.max(-0.25, Math.min(0.28, velocity / 28)));
  ctx.scale(1 + squash, 1 - squash);
  ctx.globalAlpha = alive ? 1 : 0.72;

  const bodyColor = alive ? "#ff9fbd" : "#a8b3c4";
  const snoutColor = alive ? "#ffc2d2" : "#cbd5e1";
  const earColor = alive ? "#ff82aa" : "#94a3b8";
  const accentColor = alive ? color : "#94a3b8";

  ctx.fillStyle = "rgba(16,32,51,0.12)";
  ctx.beginPath();
  ctx.ellipse(0, size * 0.58, size * 0.58, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = earColor;
  ctx.strokeStyle = self ? "#102033" : "#475569";
  ctx.lineWidth = self ? 3 : 2.2;
  ctx.beginPath();
  ctx.moveTo(-size * 0.42, -size * 0.36);
  ctx.quadraticCurveTo(-size * 0.55, -size * 0.83, -size * 0.1, -size * 0.64);
  ctx.quadraticCurveTo(-size * 0.18, -size * 0.42, -size * 0.42, -size * 0.36);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.42, -size * 0.36);
  ctx.quadraticCurveTo(size * 0.55, -size * 0.83, size * 0.1, -size * 0.64);
  ctx.quadraticCurveTo(size * 0.18, -size * 0.42, size * 0.42, -size * 0.36);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = bodyColor;
  ctx.strokeStyle = self ? "#102033" : "#475569";
  ctx.lineWidth = self ? 3.5 : 2.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.62, size * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.beginPath();
  ctx.ellipse(-size * 0.22, -size * 0.2, size * 0.16, size * 0.1, -0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-size * 0.2, -size * 0.12, size * 0.12, 0, Math.PI * 2);
  ctx.arc(size * 0.2, -size * 0.12, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#102033";
  ctx.beginPath();
  ctx.arc(-size * 0.2, -size * 0.11, size * 0.05, 0, Math.PI * 2);
  ctx.arc(size * 0.2, -size * 0.11, size * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = snoutColor;
  ctx.strokeStyle = self ? "#102033" : "#64748b";
  ctx.lineWidth = self ? 2.8 : 2;
  ctx.beginPath();
  ctx.ellipse(0, size * 0.13, size * 0.3, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#e45c87";
  ctx.beginPath();
  ctx.arc(-size * 0.1, size * 0.11, size * 0.045, 0, Math.PI * 2);
  ctx.arc(size * 0.1, size * 0.11, size * 0.045, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-size * 0.54, size * 0.2);
  ctx.lineTo(-size * 0.76, size * 0.08 - flapPulse * size * 0.14);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.54, size * 0.23);
  ctx.bezierCurveTo(size * 0.76, size * 0.12, size * 0.78, size * 0.38, size * 0.58, size * 0.34);
  ctx.stroke();

  ctx.fillStyle = "#ff7aa0";
  ctx.beginPath();
  ctx.arc(-size * 0.39, size * 0.12, size * 0.08, 0, Math.PI * 2);
  ctx.arc(size * 0.39, size * 0.12, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function renderFlappyDuel(ctx: CanvasRenderingContext2D, options: RenderOptions) {
  const { previousSnapshot, currentSnapshot: snapshot, currentUserId, interpolation, predictedSelfY, lastFlapAt, lastCrashAt } = options;
  const { worldWidth, worldHeight, birdSize, pipeWidth, pipeGap } = snapshot.config;
  const now = performance.now();
  const crashShake = lastCrashAt ? Math.max(0, 1 - (now - lastCrashAt) / 260) : 0;
  const shakeX = crashShake ? Math.sin(now * 0.08) * 5 * crashShake : 0;
  const shakeY = crashShake ? Math.cos(now * 0.1) * 3 * crashShake : 0;

  ctx.save();
  ctx.clearRect(0, 0, worldWidth, worldHeight);
  ctx.translate(shakeX, shakeY);

  const sky = ctx.createLinearGradient(0, 0, 0, worldHeight);
  sky.addColorStop(0, "#bdefff");
  sky.addColorStop(0.52, "#eafff4");
  sky.addColorStop(1, "#fff2bf");
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, worldWidth + 20, worldHeight + 20);

  drawCloud(ctx, 110, 84, 0.92);
  drawCloud(ctx, 345, 118, 0.74);
  drawCloud(ctx, 595, 76, 0.88);
  drawCloud(ctx, 790, 122, 0.7);

  for (const pipe of snapshot.pipes) {
    const previousPipe = previousSnapshot?.pipes.find((candidate) => candidate.id === pipe.id);
    const x = previousPipe ? lerp(previousPipe.x, pipe.x, interpolation) : pipe.x;
    const gapTop = pipe.gapY - pipeGap / 2;
    const gapBottom = pipe.gapY + pipeGap / 2;
    drawPipe(ctx, x, -8, pipeWidth, gapTop + 8, true);
    drawPipe(ctx, x, gapBottom, pipeWidth, worldHeight - gapBottom + 10, false);
  }

  const birdX = worldWidth * 0.25;
  const players = Object.values(snapshot.players);
  players.forEach((player, index) => {
    const previousPlayer = previousSnapshot?.players[player.userId];
    const isSelf = player.userId === currentUserId;
    const interpolatedY = previousPlayer ? lerp(previousPlayer.y, player.y, interpolation) : player.y;
    const y = isSelf && predictedSelfY !== null ? lerp(interpolatedY, predictedSelfY, 0.35) : interpolatedY;
    const flapPulse = isSelf ? Math.max(0, 1 - (now - lastFlapAt) / 170) : 0;

    ctx.save();
    ctx.globalAlpha = isSelf ? 1 : 0.38;
    drawPig(ctx, {
      x: birdX,
      y,
      size: birdSize,
      color: playerColor(player.userId, index),
      velocity: player.velocity,
      alive: player.alive,
      self: isSelf,
      flapPulse
    });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = isSelf ? 0.95 : 0.62;
    ctx.font = "800 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.fillStyle = player.alive ? "#102033" : "#64748b";
    ctx.strokeText(player.displayName, birdX, y - birdSize - 9);
    ctx.fillText(player.displayName, birdX, y - birdSize - 9);
    ctx.restore();
  });

  ctx.fillStyle = "#76d7ff";
  ctx.fillRect(-10, worldHeight - 18, worldWidth + 20, 18);
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fillRect(-10, worldHeight - 18, worldWidth + 20, 4);
  ctx.restore();
}
