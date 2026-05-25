import { createServer } from "node:http";
import nextEnv from "@next/env";
import type { Server as SocketServer } from "socket.io";
import { broadcastOpenRooms } from "./room-handlers";
import { createSocketServer } from "./socket";

nextEnv.loadEnvConfig(process.cwd());

const port = Number(process.env.SOCKET_PORT || 4000);
let io: SocketServer | null = null;

const httpServer = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `localhost:${port}`}`);

  if (request.method === "POST" && url.pathname === "/internal/open-rooms-updated") {
    if (!io) {
      response.writeHead(503, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: false, error: "Socket server is not ready." }));
      return;
    }

    await broadcastOpenRooms(io);
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ ok: true, service: "game-hub-socket" }));
});

io = createSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`Socket.IO server ready at http://localhost:${port}`);
  console.log("Socket features: room-lifecycle, flappy-duel-runtime, game-sync-ack");
});
