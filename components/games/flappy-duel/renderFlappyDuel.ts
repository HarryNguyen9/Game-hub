import type { FlappySnapshot } from "@/lib/games/flappy-duel/types";

export function renderFlappyDuel(ctx: CanvasRenderingContext2D, snapshot: FlappySnapshot, currentUserId: string) {
  const { worldWidth, worldHeight, birdSize, pipeWidth, pipeGap } = snapshot.config;
  ctx.clearRect(0, 0, worldWidth, worldHeight);

  const sky = ctx.createLinearGradient(0, 0, 0, worldHeight);
  sky.addColorStop(0, "#c7f0ff");
  sky.addColorStop(1, "#fff4c7");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, worldWidth, worldHeight);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse(120 + i * 190, 70 + (i % 2) * 40, 52, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const pipe of snapshot.pipes) {
    const gapTop = pipe.gapY - pipeGap / 2;
    const gapBottom = pipe.gapY + pipeGap / 2;
    ctx.fillStyle = "#70d66b";
    ctx.strokeStyle = "#36a852";
    ctx.lineWidth = 4;
    ctx.fillRect(pipe.x, 0, pipeWidth, gapTop);
    ctx.strokeRect(pipe.x, 0, pipeWidth, gapTop);
    ctx.fillRect(pipe.x, gapBottom, pipeWidth, worldHeight - gapBottom);
    ctx.strokeRect(pipe.x, gapBottom, pipeWidth, worldHeight - gapBottom);
  }

  const birdX = worldWidth * 0.25;
  for (const player of Object.values(snapshot.players)) {
    const isSelf = player.userId === currentUserId;
    ctx.save();
    ctx.globalAlpha = isSelf ? 1 : 0.35;
    ctx.translate(birdX, player.y);
    ctx.rotate(Math.max(-0.5, Math.min(0.8, player.velocity / 12)));
    ctx.fillStyle = player.alive ? (isSelf ? "#ff6f91" : "#64748b") : "#94a3b8";
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, birdSize * 0.65, birdSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(birdSize * 0.22, -birdSize * 0.12, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(birdSize * 0.28, -birdSize * 0.12, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffcf5a";
    ctx.beginPath();
    ctx.moveTo(birdSize * 0.6, 0);
    ctx.lineTo(birdSize * 0.95, -5);
    ctx.lineTo(birdSize * 0.95, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = isSelf ? 1 : 0.5;
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(player.displayName, birdX, player.y - birdSize);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "#7dd3fc";
  ctx.fillRect(0, worldHeight - 18, worldWidth, 18);
}
