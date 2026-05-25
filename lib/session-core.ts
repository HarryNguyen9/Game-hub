import { jwtVerify, SignJWT } from "jose";

export type UserRole = "user" | "admin";

export type SessionPayload = {
  userId: string;
  username: string;
  role: UserRole;
};

const encoder = new TextEncoder();

export async function createSessionToken(payload: SessionPayload, secret: string) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encoder.encode(secret));
}

export async function verifySessionToken(token: string | undefined, secret: string): Promise<SessionPayload | null> {
  if (!token || !secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret));
    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string" ||
      (payload.role !== "user" && payload.role !== "admin")
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role
    };
  } catch {
    return null;
  }
}
