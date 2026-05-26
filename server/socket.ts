import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { registerRoomHandlers } from "./room-handlers";
import { authenticateSocket } from "./auth";
import { registerFlappyDuelHandlers } from "./socket/flappy-duel-handlers";

export function allowedOrigins() {
  const origins = process.env.APP_ORIGIN?.split(",").map(normalizeOrigin).filter(Boolean);
  return origins?.length ? origins : ["http://localhost:3000"];
}

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, "");
}

export function createSocketServer(httpServer: HttpServer) {
  const origins = allowedOrigins();
  const isAllowedOrigin = (origin?: string) => {
    const normalizedOrigin = origin ? normalizeOrigin(origin) : undefined;
    return !normalizedOrigin || origins.includes(normalizedOrigin);
  };

  const io = new Server(httpServer, {
    allowRequest(request, callback) {
      const origin = request.headers.origin;
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      console.warn("[socket-allow-request] Blocked origin", { origin: origin ? normalizeOrigin(origin) : null, allowedOrigins: origins });
      callback("Origin is not allowed by APP_ORIGIN.", false);
    },
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        console.warn("[socket-cors] Blocked origin", { origin: origin ? normalizeOrigin(origin) : null, allowedOrigins: origins });
        callback(new Error("Origin is not allowed by APP_ORIGIN."));
      },
      credentials: true
    }
  });

  io.use(authenticateSocket);
  io.on("connection", (socket) => {
    registerRoomHandlers(io, socket);
    registerFlappyDuelHandlers(io, socket);
  });

  return io;
}
