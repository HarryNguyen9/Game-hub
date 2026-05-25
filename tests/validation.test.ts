import { describe, expect, it } from "vitest";
import { adminResetPasswordSchema, changePasswordSchema, createRoomSchema, joinRoomSchema, registerSchema, usernameSchema } from "@/lib/validation";

describe("validation schemas", () => {
  it("normalizes usernames and rejects unsafe characters", () => {
    expect(usernameSchema.parse(" Player_One ")).toBe("player_one");
    expect(() => usernameSchema.parse("bad name")).toThrow();
  });

  it("requires password confirmation to match", () => {
    expect(
      changePasswordSchema.safeParse({
        oldPassword: "secret1",
        newPassword: "secret2",
        confirmPassword: "different"
      }).success
    ).toBe(false);
  });

  it("requires display name when registering", () => {
    expect(
      registerSchema.safeParse({
        username: "player",
        displayName: "Player One",
        password: "secret123"
      }).success
    ).toBe(true);

    expect(
      registerSchema.safeParse({
        username: "player",
        password: "secret123"
      }).success
    ).toBe(false);
  });

  it("allows creating rooms before choosing a game", () => {
    expect(createRoomSchema.parse({ name: "Friday Quiz", hasPassword: false })).toEqual({
      name: "Friday Quiz",
      hasPassword: false
    });
    expect(() => createRoomSchema.parse({ name: "Locked", hasPassword: true })).toThrow();
  });

  it("validates 4-digit room codes for joining", () => {
    expect(joinRoomSchema.safeParse({ roomCode: "1234" }).success).toBe(true);
    expect(joinRoomSchema.safeParse({ roomCode: "12ab" }).success).toBe(false);
    expect(joinRoomSchema.safeParse({ roomCode: "" }).success).toBe(false);
  });

  it("validates admin reset payloads", () => {
    expect(
      adminResetPasswordSchema.safeParse({
        userId: "not-a-uuid",
        newPassword: "secret2"
      }).success
    ).toBe(false);
  });
});
