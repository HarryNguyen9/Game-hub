import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";

type Rgba = [number, number, number, number];
type Point = { x: number; y: number };
type ElementName = "fire" | "ice" | "lightning" | "earth";

const root = join(process.cwd(), "public", "games", "elemental-duels");

const palette = {
  fire: {
    body: hex("#fb7185"),
    dark: hex("#be123c"),
    light: hex("#fed7aa"),
    accent: hex("#fb923c"),
    glow: hex("#ffedd5")
  },
  ice: {
    body: hex("#67e8f9"),
    dark: hex("#0284c7"),
    light: hex("#ecfeff"),
    accent: hex("#38bdf8"),
    glow: hex("#e0f2fe")
  },
  lightning: {
    body: hex("#facc15"),
    dark: hex("#7c3aed"),
    light: hex("#fef9c3"),
    accent: hex("#a78bfa"),
    glow: hex("#faf5ff")
  },
  earth: {
    body: hex("#a3a956"),
    dark: hex("#4d7c0f"),
    light: hex("#e7e5c1"),
    accent: hex("#84cc16"),
    glow: hex("#ecfccb")
  },
  slate: {
    ink: hex("#0f172a"),
    shadow: hex("#334155"),
    stone: hex("#78716c"),
    foam: hex("#ffffff")
  }
};

class Raster {
  readonly data: Uint8Array;

  constructor(readonly width: number, readonly height: number) {
    this.data = new Uint8Array(width * height * 4);
  }

  pixel(x: number, y: number, color: Rgba) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height || color[3] <= 0) return;
    const offset = (iy * this.width + ix) * 4;
    const alpha = color[3] / 255;
    const inv = 1 - alpha;
    this.data[offset] = Math.round(color[0] * alpha + this.data[offset] * inv);
    this.data[offset + 1] = Math.round(color[1] * alpha + this.data[offset + 1] * inv);
    this.data[offset + 2] = Math.round(color[2] * alpha + this.data[offset + 2] * inv);
    this.data[offset + 3] = Math.min(255, Math.round(color[3] + this.data[offset + 3] * inv));
  }

  circle(cx: number, cy: number, radius: number, color: Rgba) {
    const minX = Math.floor(cx - radius);
    const maxX = Math.ceil(cx + radius);
    const minY = Math.floor(cy - radius);
    const maxY = Math.ceil(cy + radius);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= radius * radius) this.pixel(x, y, color);
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: Rgba) {
    const minX = Math.floor(cx - rx);
    const maxX = Math.ceil(cx + rx);
    const minY = Math.floor(cy - ry);
    const maxY = Math.ceil(cy + ry);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.pixel(x, y, color);
      }
    }
  }

  rect(x: number, y: number, width: number, height: number, color: Rgba) {
    for (let yy = Math.floor(y); yy < y + height; yy += 1) {
      for (let xx = Math.floor(x); xx < x + width; xx += 1) this.pixel(xx, yy, color);
    }
  }

  roundedRect(x: number, y: number, width: number, height: number, radius: number, color: Rgba) {
    for (let yy = Math.floor(y); yy < y + height; yy += 1) {
      for (let xx = Math.floor(x); xx < x + width; xx += 1) {
        const innerX = Math.max(x + radius, Math.min(xx, x + width - radius));
        const innerY = Math.max(y + radius, Math.min(yy, y + height - radius));
        const dx = xx - innerX;
        const dy = yy - innerY;
        if (dx * dx + dy * dy <= radius * radius) this.pixel(xx, yy, color);
      }
    }
  }

  line(from: Point, to: Point, radius: number, color: Rgba) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y)));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      this.circle(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, radius, color);
    }
  }

  polygon(points: Point[], color: Rgba) {
    const minX = Math.floor(Math.min(...points.map((p) => p.x)));
    const maxX = Math.ceil(Math.max(...points.map((p) => p.x)));
    const minY = Math.floor(Math.min(...points.map((p) => p.y)));
    const maxY = Math.ceil(Math.max(...points.map((p) => p.y)));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (insidePolygon({ x: x + 0.5, y: y + 0.5 }, points)) this.pixel(x, y, color);
      }
    }
  }
}

function hex(value: string, alpha = 255): Rgba {
  const clean = value.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
    alpha
  ];
}

function withAlpha(color: Rgba, alpha: number): Rgba {
  return [color[0], color[1], color[2], alpha];
}

function insidePolygon(point: Point, points: Point[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

function outlineCircle(img: Raster, x: number, y: number, radius: number, stroke: Rgba, fill: Rgba, strokeWidth = 3) {
  img.circle(x, y, radius + strokeWidth, stroke);
  img.circle(x, y, radius, fill);
}

function face(img: Raster, x: number, y: number, scale = 1) {
  img.circle(x - 5 * scale, y - 1 * scale, 1.8 * scale, palette.slate.ink);
  img.circle(x + 5 * scale, y - 1 * scale, 1.8 * scale, palette.slate.ink);
  img.ellipse(x, y + 6 * scale, 6 * scale, 3 * scale, withAlpha(palette.slate.ink, 210));
  img.ellipse(x, y + 5 * scale, 4.2 * scale, 1.7 * scale, hex("#fff7ed"));
}

function drawElementIcon(img: Raster, element: ElementName, x: number, y: number, scale = 1) {
  const p = palette[element];
  if (element === "fire") {
    img.polygon([
      { x, y: y - 12 * scale },
      { x: x + 9 * scale, y: y + 3 * scale },
      { x: x + 1 * scale, y: y + 11 * scale },
      { x: x - 7 * scale, y: y + 3 * scale }
    ], p.accent);
    img.polygon([
      { x: x + 1 * scale, y: y - 6 * scale },
      { x: x + 5 * scale, y: y + 4 * scale },
      { x: x - 2 * scale, y: y + 8 * scale }
    ], p.light);
  } else if (element === "ice") {
    img.line({ x: x - 10 * scale, y }, { x: x + 10 * scale, y }, 1.5 * scale, p.dark);
    img.line({ x, y: y - 10 * scale }, { x, y: y + 10 * scale }, 1.5 * scale, p.dark);
    img.line({ x: x - 7 * scale, y: y - 7 * scale }, { x: x + 7 * scale, y: y + 7 * scale }, 1.2 * scale, p.accent);
    img.line({ x: x - 7 * scale, y: y + 7 * scale }, { x: x + 7 * scale, y: y - 7 * scale }, 1.2 * scale, p.accent);
  } else if (element === "lightning") {
    img.polygon([
      { x: x + 2 * scale, y: y - 13 * scale },
      { x: x - 7 * scale, y },
      { x: x - 1 * scale, y },
      { x: x - 4 * scale, y: y + 13 * scale },
      { x: x + 9 * scale, y: y - 3 * scale },
      { x: x + 2 * scale, y: y - 3 * scale }
    ], p.dark);
  } else {
    img.roundedRect(x - 8 * scale, y - 7 * scale, 16 * scale, 15 * scale, 3 * scale, p.dark);
    img.rect(x - 3 * scale, y - 12 * scale, 7 * scale, 6 * scale, p.accent);
  }
}

function drawMonster(file: string, element: ElementName, type: "normal" | "runner" | "armored" | "splitter" | "splitter-small" | "giant") {
  const size = type === "splitter-small" ? 48 : type === "giant" ? 96 : 64;
  const img = new Raster(size, size);
  const p = palette[element];
  const cx = size / 2;
  const cy = size / 2 + (type === "giant" ? 8 : 4);
  const body = type === "runner" ? 18 : type === "splitter-small" ? 14 : type === "giant" ? 33 : 22;

  img.ellipse(cx, cy + body * 0.9, body * 0.82, body * 0.22, withAlpha(palette.slate.shadow, 55));
  img.circle(cx, cy, body + 6, withAlpha(p.glow, 190));

  if (type === "runner") {
    img.polygon([{ x: 9, y: 38 }, { x: 2, y: 29 }, { x: 15, y: 26 }], withAlpha(p.accent, 210));
    outlineCircle(img, cx + 4, cy, body, p.dark, p.body);
  } else if (type === "giant") {
    img.roundedRect(cx - body, cy - body + 8, body * 2, body * 1.75, 12, p.dark);
    img.roundedRect(cx - body + 4, cy - body + 12, body * 2 - 8, body * 1.75 - 8, 10, p.body);
    img.rect(cx - 20, cy + 25, 14, 14, p.dark);
    img.rect(cx + 7, cy + 25, 14, 14, p.dark);
  } else if (type === "armored") {
    outlineCircle(img, cx, cy, body + 1, p.dark, p.body);
    img.roundedRect(cx - 18, cy - 16, 36, 32, 7, withAlpha(p.light, 160));
    img.roundedRect(cx - 13, cy - 11, 26, 22, 5, withAlpha(p.body, 230));
  } else {
    outlineCircle(img, cx, cy, body, p.dark, p.body);
  }

  img.circle(cx - body * 0.28, cy - body * 0.24, body * 0.28, withAlpha(p.light, 165));
  face(img, cx, cy + (type === "giant" ? 3 : 2), type === "splitter-small" ? 0.72 : type === "giant" ? 1.25 : 1);

  if (type === "splitter") {
    drawElementIcon(img, "lightning", cx + 16, cy - 18, 0.9);
    img.line({ x: cx - 24, y: cy + 4 }, { x: cx - 35, y: cy - 7 }, 1.5, p.dark);
    img.line({ x: cx + 24, y: cy + 4 }, { x: cx + 35, y: cy - 7 }, 1.5, p.dark);
  } else if (type === "splitter-small") {
    drawElementIcon(img, "lightning", cx + 11, cy - 12, 0.55);
  } else if (type === "runner") {
    drawElementIcon(img, "fire", cx + 13, cy - 16, 0.65);
  } else {
    drawElementIcon(img, element, cx + body * 0.6, cy - body * 0.55, type === "giant" ? 1.15 : 0.75);
  }

  save(file, img);
}

function drawTower(file: string, element: ElementName) {
  const img = new Raster(80, 80);
  const p = palette[element];
  img.ellipse(40, 65, 24, 7, withAlpha(palette.slate.shadow, 55));
  img.roundedRect(26, 28, 28, 36, 7, p.dark);
  img.roundedRect(30, 31, 20, 30, 5, p.body);
  img.roundedRect(21, 56, 38, 12, 6, p.dark);
  img.roundedRect(25, 57, 30, 8, 4, p.light);
  if (element === "fire") {
    drawElementIcon(img, "fire", 40, 22, 1.25);
  } else if (element === "ice") {
    img.polygon([{ x: 40, y: 7 }, { x: 52, y: 26 }, { x: 40, y: 37 }, { x: 28, y: 26 }], p.light);
    img.line({ x: 40, y: 9 }, { x: 40, y: 35 }, 2, p.dark);
  } else if (element === "lightning") {
    img.circle(40, 22, 15, p.light);
    drawElementIcon(img, "lightning", 40, 22, 1.05);
  } else {
    img.circle(40, 22, 15, p.dark);
    img.circle(40, 21, 11, p.body);
    img.rect(34, 14, 7, 5, p.accent);
  }
  save(file, img);
}

function drawProjectile(file: string, kind: "fireball" | "ice-shard" | "lightning-orb" | "rock") {
  const img = new Raster(32, 32);
  if (kind === "fireball") {
    img.circle(15, 17, 12, withAlpha(palette.fire.glow, 190));
    img.circle(17, 16, 8, palette.fire.accent);
    img.circle(19, 13, 4, palette.fire.light);
    img.polygon([{ x: 6, y: 17 }, { x: 0, y: 10 }, { x: 8, y: 9 }], withAlpha(palette.fire.body, 220));
  } else if (kind === "ice-shard") {
    img.polygon([{ x: 16, y: 2 }, { x: 27, y: 15 }, { x: 17, y: 30 }, { x: 5, y: 16 }], palette.ice.light);
    img.line({ x: 16, y: 4 }, { x: 17, y: 28 }, 1.4, palette.ice.dark);
    img.line({ x: 7, y: 16 }, { x: 26, y: 15 }, 1, palette.ice.accent);
  } else if (kind === "lightning-orb") {
    img.circle(16, 16, 12, withAlpha(palette.lightning.light, 210));
    img.circle(16, 16, 8, palette.lightning.body);
    drawElementIcon(img, "lightning", 16, 16, 0.75);
  } else {
    img.circle(16, 17, 11, palette.slate.stone);
    img.circle(12, 13, 3, hex("#a8a29e", 190));
    img.circle(20, 20, 2, hex("#44403c", 200));
  }
  save(file, img);
}

function drawEffect(file: string, kind: "burn" | "slow" | "stun" | "hit-pop") {
  const img = new Raster(48, 48);
  if (kind === "burn") {
    drawElementIcon(img, "fire", 24, 24, 1.5);
    img.circle(24, 26, 18, withAlpha(palette.fire.glow, 80));
  } else if (kind === "slow") {
    drawElementIcon(img, "ice", 24, 24, 1.5);
    img.circle(24, 24, 18, withAlpha(palette.ice.glow, 110));
  } else if (kind === "stun") {
    drawElementIcon(img, "lightning", 24, 24, 1.4);
    img.circle(24, 24, 17, withAlpha(palette.lightning.glow, 110));
  } else {
    img.circle(24, 24, 16, withAlpha(hex("#ffffff"), 170));
    img.circle(24, 24, 9, withAlpha(hex("#fb7185"), 210));
    img.circle(24, 24, 4, hex("#ffffff"));
  }
  save(file, img);
}

function save(relativePath: string, img: Raster) {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, encodePng(img));
  console.log(`wrote public/games/elemental-duels/${relativePath}`);
}

function encodePng(img: Raster) {
  const raw = Buffer.alloc((img.width * 4 + 1) * img.height);
  for (let y = 0; y < img.height; y += 1) {
    const rowStart = y * (img.width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < img.width * 4; x += 1) {
      raw[rowStart + 1 + x] = img.data[y * img.width * 4 + x];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr(img.width, img.height)),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function ihdr(width: number, height: number) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function chunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

drawMonster("monsters/fire-normal.png", "fire", "normal");
drawMonster("monsters/ice-normal.png", "ice", "normal");
drawMonster("monsters/lightning-normal.png", "lightning", "normal");
drawMonster("monsters/earth-normal.png", "earth", "normal");
drawMonster("monsters/fire-runner.png", "fire", "runner");
drawMonster("monsters/ice-armored.png", "ice", "armored");
drawMonster("monsters/lightning-splitter.png", "lightning", "splitter");
drawMonster("monsters/lightning-splitter-small.png", "lightning", "splitter-small");
drawMonster("monsters/earth-giant.png", "earth", "giant");

drawTower("towers/fire-tower.png", "fire");
drawTower("towers/ice-tower.png", "ice");
drawTower("towers/lightning-tower.png", "lightning");
drawTower("towers/earth-tower.png", "earth");

drawProjectile("projectiles/fireball.png", "fireball");
drawProjectile("projectiles/ice-shard.png", "ice-shard");
drawProjectile("projectiles/lightning-orb.png", "lightning-orb");
drawProjectile("projectiles/rock.png", "rock");

drawEffect("effects/burn.png", "burn");
drawEffect("effects/slow.png", "slow");
drawEffect("effects/stun.png", "stun");
drawEffect("effects/hit-pop.png", "hit-pop");
