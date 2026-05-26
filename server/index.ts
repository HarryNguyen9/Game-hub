import { createServer } from "node:http";
import nextEnv from "@next/env";
import type { Server as SocketServer } from "socket.io";
import { broadcastOpenRooms } from "./room-handlers";
import { allowedOrigins, createSocketServer } from "./socket";

nextEnv.loadEnvConfig(process.cwd());

const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT || process.env.SOCKET_PORT || 4000);
let io: SocketServer | null = null;

const httpServer = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `localhost:${port}`}`);

  if (request.method === "GET" && url.pathname === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        ok: true,
        service: "game-hub-socket",
        allowedOrigins: allowedOrigins(),
        env: {
          APP_ORIGIN: Boolean(process.env.APP_ORIGIN),
          NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
          NODE_ENV: process.env.NODE_ENV || null,
          PORT: Boolean(process.env.PORT),
          SOCKET_PORT: Boolean(process.env.SOCKET_PORT)
        }
      })
    );
    return;
  }

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

httpServer.listen(port, hostname, () => {
  console.log(`Socket.IO server ready at http://${hostname}:${port}`);
  console.log("Socket features: room-lifecycle, flappy-duel-runtime, game-sync-ack");
});
