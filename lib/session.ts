import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { requiredEnv } from "@/lib/env";
import { createSessionToken, verifySessionToken, type SessionPayload } from "@/lib/session-core";

const maxAge = 60 * 60 * 24 * 7;

export async function getSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value, requiredEnv("SESSION_SECRET"));
}

export async function setSession(payload: SessionPayload) {
  const cookieStore = await cookies();
  const token = await createSessionToken(payload, requiredEnv("SESSION_SECRET"));
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/"
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
