import { clearSession } from "@/lib/session";
import { ok } from "@/lib/http";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await clearSession();
  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }
  return ok({ ok: true });
}
