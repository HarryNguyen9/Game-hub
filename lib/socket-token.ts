import { jwtVerify, SignJWT } from "jose";
import type { UserRole } from "@/lib/session-core";

export type SocketTokenPayload = {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
};

const encoder = new TextEncoder();

export async function createSocketToken(payload: SocketTokenPayload, secret: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(encoder.encode(secret));
}

export async function verifySocketToken(token: string | undefined, secret: string): Promise<SocketTokenPayload | null> {
  if (!token || !secret) return null;

  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret));
    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.displayName !== "string" ||
      (payload.role !== "user" && payload.role !== "admin")
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      displayName: payload.displayName,
      role: payload.role
    };
  } catch {
    return null;
  }
}
