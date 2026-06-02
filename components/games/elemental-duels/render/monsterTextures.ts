import type { ElementKey, ElementalMonster } from "@/lib/games/elemental-duels/types";

type TextureLike = {
  getContext: () => CanvasRenderingContext2D;
  refresh: () => void;
};

type TextureScene = {
  textures: {
    exists: (key: string) => boolean;
    createCanvas: (key: string, width: number, height: number) => TextureLike | null;
  };
};

const elementPalette: Record<ElementKey, { body: string; dark: string; light: string; glow: string }> = {
  fire: { body: "#fb7185", dark: "#be123c", light: "#fed7aa", glow: "#ffedd5" },
  ice: { body: "#67e8f9", dark: "#0284c7", light: "#ecfeff", glow: "#e0f2fe" },
  lightning: { body: "#facc15", dark: "#7c3aed", light: "#fef9c3", glow: "#faf5ff" },
  earth: { body: "#a3a956", dark: "#4d7c0f", light: "#e7e5c1", glow: "#ecfccb" }
};

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
  ctx.stroke();
}

function drawFace(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(x - 5 * scale, y - 1 * scale, 2.2 * scale, 0, Math.PI * 2);
  ctx.arc(x + 5 * scale, y - 1 * scale, 2.2 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 1.4 * scale;
  ctx.beginPath();
  ctx.arc(x, y + 4 * scale, 5 * scale, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
}

function drawIcon(ctx: CanvasRenderingContext2D, element: ElementKey, x: number, y: number) {
  if (element === "fire") {
    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.quadraticCurveTo(x + 9, y - 5, x + 4, y + 5);
    ctx.quadraticCurveTo(x, y + 12, x - 6, y + 5);
    ctx.quadraticCurveTo(x - 10, y - 4, x, y - 12);
    ctx.fill();
    return;
  }
  if (element === "ice") {
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((Math.PI / 3) * i);
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(9, 0);
      ctx.stroke();
      ctx.restore();
    }
    return;
  }
  if (element === "lightning") {
    ctx.fillStyle = "#7c3aed";
    ctx.beginPath();
    ctx.moveTo(x + 1, y - 12);
    ctx.lineTo(x - 7, y + 1);
    ctx.lineTo(x, y + 1);
    ctx.lineTo(x - 2, y + 12);
    ctx.lineTo(x + 8, y - 2);
    ctx.lineTo(x + 1, y - 2);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.fillStyle = "#4d7c0f";
  ctx.fillRect(x - 9, y - 8, 18, 16);
  ctx.fillStyle = "#84cc16";
  ctx.fillRect(x - 4, y - 13, 8, 6);
}

function drawMonster(ctx: CanvasRenderingContext2D, element: ElementKey, type: string, small = false) {
  const palette = elementPalette[element] || elementPalette.earth;
  const center = 40;
  const bodyScale = small ? 0.78 : type === "earth-giant" ? 1.2 : 1;
  const bodyRadius = 20 * bodyScale;
  ctx.clearRect(0, 0, 80, 80);
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = palette.glow;
  ctx.beginPath();
  ctx.arc(center, center + 4, 25 * bodyScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = 4;
  ctx.fillStyle = palette.body;
  if (type === "earth-giant" || element === "earth") {
    roundedRect(ctx, center - bodyRadius, center - bodyRadius + 4, bodyRadius * 2, bodyRadius * 1.85, 12);
  } else {
    ctx.beginPath();
    ctx.arc(center, center + 4, bodyRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = palette.light;
  ctx.beginPath();
  ctx.arc(center - 7 * bodyScale, center - 2 * bodyScale, 5 * bodyScale, 0, Math.PI * 2);
  ctx.fill();
  drawFace(ctx, center, center + 3, bodyScale);

  if (type === "fire-runner") {
    ctx.fillStyle = "#fdba74";
    ctx.beginPath();
    ctx.moveTo(18, 44);
    ctx.lineTo(3, 36);
    ctx.lineTo(16, 30);
    ctx.fill();
  } else if (type === "ice-armored") {
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, 32, 32);
  } else if (type === "lightning-splitter") {
    drawIcon(ctx, "lightning", 52, 24);
  } else if (type === "earth-giant") {
    ctx.fillStyle = "#4d7c0f";
    ctx.fillRect(21, 51, 12, 12);
    ctx.fillRect(47, 51, 12, 12);
  } else {
    drawIcon(ctx, element, 55, 24);
  }
}

export function monsterTextureKey(monster: Pick<ElementalMonster, "element" | "monsterType" | "maxHp">) {
  if (monster.monsterType === "normal" && monster.maxHp < 25) return `monster-${monster.element}-splitter-small`;
  if (monster.monsterType === "normal") return `monster-${monster.element}-normal`;
  return `monster-${monster.element}-${monster.monsterType}`;
}

export function monsterVisualScale(monster: Pick<ElementalMonster, "monsterType" | "maxHp">) {
  if (monster.monsterType === "earth-giant") return 0.76;
  if (monster.monsterType === "fire-runner") return 0.48;
  if (monster.monsterType === "normal" && monster.maxHp < 25) return 0.42;
  return 0.58;
}

export function ensureMonsterTextures(scene: TextureScene) {
  const elements: ElementKey[] = ["fire", "ice", "lightning", "earth"];
  const types = ["normal", "fire-runner", "ice-armored", "lightning-splitter", "earth-giant"];
  for (const element of elements) {
    for (const type of types) {
      const key = `monster-${element}-${type}`;
      if (!scene.textures.exists(key)) {
        const texture = scene.textures.createCanvas(key, 80, 80);
        if (!texture) continue;
        drawMonster(texture.getContext(), element, type);
        texture.refresh();
      }
    }
    const smallKey = `monster-${element}-splitter-small`;
    if (!scene.textures.exists(smallKey)) {
      const texture = scene.textures.createCanvas(smallKey, 80, 80);
      if (!texture) continue;
      drawMonster(texture.getContext(), element, "normal", true);
      texture.refresh();
    }
  }
  if (!scene.textures.exists("monster-fallback")) {
    const texture = scene.textures.createCanvas("monster-fallback", 80, 80);
    if (!texture) return;
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, 80, 80);
    ctx.fillStyle = "#e2e8f0";
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(40, 43, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawFace(ctx, 40, 42);
    texture.refresh();
  }
}
