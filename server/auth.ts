import type { Socket } from "socket.io";
import { verifySocketToken, type SocketTokenPayload } from "../lib/socket-token";

export type AuthedSocket = Socket & {
  data: {
    user: SocketTokenPayload;
    rooms?: Set<string>;
  };
};

export async function authenticateSocket(socket: Socket, next: (error?: Error) => void) {
  const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : undefined;
  const user = await verifySocketToken(token, process.env.SESSION_SECRET || "");

  if (!user) {
    console.warn("[socket-auth] Unauthorized socket connection", {
      hasToken: Boolean(token),
      origin: socket.handshake.headers.origin,
      hasSessionSecret: Boolean(process.env.SESSION_SECRET)
    });
    next(new Error("Unauthorized"));
    return;
  }

  socket.data.user = user;
  next();
}
