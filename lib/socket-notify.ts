import "server-only";

export async function notifyOpenRoomsChanged() {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!socketUrl) return;

  try {
    const endpoint = new URL("/internal/open-rooms-updated", socketUrl);
    await fetch(endpoint, { method: "POST", cache: "no-store" });
  } catch (error) {
    console.warn("[socket-notify] Could not notify socket server about open rooms update", error);
  }
}
