const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRoomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function initialAvatarLabel(displayName: string, username: string) {
  return (displayName || username || "?").slice(0, 1).toUpperCase();
}
