import { randomInt } from "node:crypto";

export function createRoomCode() {
  return randomInt(0, 10000).toString().padStart(4, "0");
}
