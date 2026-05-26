export const TURN_DURATION_SECONDS = 30;

export function createTurnWindow(now = Date.now()) {
  return {
    turnStartedAt: now,
    turnEndsAt: now + TURN_DURATION_SECONDS * 1000,
    turnDurationSeconds: TURN_DURATION_SECONDS
  };
}
