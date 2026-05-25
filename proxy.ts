import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { verifySessionToken } from "@/lib/session-core";

const protectedRoutes = ["/dashboard", "/profile", "/rooms", "/admin"];
const guestRoutes = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = protectedRoutes.some((route) => path === route || path.startsWith(`${route}/`));
  const isGuest = guestRoutes.includes(path);
  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
    process.env.SESSION_SECRET || ""
  );

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (path.startsWith("/admin") && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isGuest && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/rooms/:path*", "/admin/:path*", "/login", "/register"]
};
