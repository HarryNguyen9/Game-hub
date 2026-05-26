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
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        const normalizedOrigin = origin ? normalizeOrigin(origin) : undefined;
        if (!normalizedOrigin || origins.includes(normalizedOrigin)) {
          callback(null, true);
          return;
        }

        console.warn("[socket-cors] Blocked origin", { origin: normalizedOrigin, allowedOrigins: origins });
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
