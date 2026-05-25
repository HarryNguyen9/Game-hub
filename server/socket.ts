import { Server } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { registerRoomHandlers } from "./room-handlers";
import { authenticateSocket } from "./auth";
import { registerFlappyDuelHandlers } from "./socket/flappy-duel-handlers";

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.APP_ORIGIN || "http://localhost:3000",
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
