import { describe, expect, it } from "vitest";
import {
  allPlayersReady,
  backToLobbyMembers,
  canToggleReady,
  createHostMember,
  memberForJoin,
  startGameMembers
} from "@/lib/room-lifecycle";

describe("room lifecycle", () => {
  it("makes host auto-ready and late joiners wait for next round", () => {
    expect(createHostMember("host")).toMatchObject({ role: "host", ready: true, participationStatus: "lobby" });
    expect(memberForJoin("late", "playing")).toMatchObject({
      role: "player",
      ready: false,
      participationStatus: "waiting_next_round"
    });
  });

  it("allows only lobby players to toggle ready while waiting", () => {
    expect(canToggleReady(memberForJoin("player", "waiting"), "waiting")).toBe(true);
    expect(canToggleReady(createHostMember("host"), "waiting")).toBe(false);
    expect(canToggleReady(memberForJoin("late", "playing"), "playing")).toBe(false);
  });

  it("requires every lobby player to be ready before start", () => {
    expect(allPlayersReady([createHostMember("host")])).toBe(true);
    expect(allPlayersReady([createHostMember("host"), { ...memberForJoin("p1", "waiting"), ready: false }])).toBe(false);
    expect(allPlayersReady([createHostMember("host"), { ...memberForJoin("p1", "waiting"), ready: true }])).toBe(true);
  });

  it("moves lobby members into active game and resets everyone on back to lobby", () => {
    const members = [createHostMember("host"), { ...memberForJoin("p1", "waiting"), ready: true }, memberForJoin("late", "playing")];
    const started = startGameMembers(members);
    expect(started.map((member) => member.participationStatus)).toEqual(["active_game", "active_game", "waiting_next_round"]);
    const lobby = backToLobbyMembers(started);
    expect(lobby).toEqual([
      expect.objectContaining({ role: "host", ready: true, participationStatus: "lobby" }),
      expect.objectContaining({ role: "player", ready: false, participationStatus: "lobby" }),
      expect.objectContaining({ role: "player", ready: false, participationStatus: "lobby" })
    ]);
  });
});
