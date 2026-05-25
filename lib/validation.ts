import { z } from "zod";
import { GAME_CATALOG } from "@/lib/constants";

const gameIds = GAME_CATALOG.map((game) => game.id) as [string, ...string[]];

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be at most 24 characters.")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only use letters, numbers, and underscores.")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters.")
  .max(72, "Password must be at most 72 characters.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name is required.")
  .max(40, "Display name must be at most 40 characters.");

export const roomNameSchema = z
  .string()
  .trim()
  .min(3, "Room name must be at least 3 characters.")
  .max(48, "Room name must be at most 48 characters.");

export const registerSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema
});

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema
});

export const profileSchema = z.object({
  displayName: displayNameSchema
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password is required."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required.")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation must match.",
    path: ["confirmPassword"]
  });

export const adminResetPasswordSchema = z.object({
  userId: z.string().uuid("Invalid user id."),
  newPassword: passwordSchema
});

export const createRoomSchema = z.object({
  name: roomNameSchema,
  hasPassword: z.boolean().default(false),
  password: z.string().max(72, "Room password must be at most 72 characters.").optional()
}).refine((data) => !data.hasPassword || Boolean(data.password?.trim()), {
  message: "Room password is required for private rooms.",
  path: ["password"]
});

export const roomCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, "Room code must be exactly 4 digits.");

export const joinRoomSchema = z
  .object({
    roomId: z.string().uuid("Invalid room id.").optional(),
    roomCode: roomCodeSchema.optional(),
    password: z.string().optional()
  })
  .refine((data) => Boolean(data.roomId || data.roomCode), {
    message: "Room code is required.",
    path: ["roomCode"]
  });

export const selectRoomGameSchema = z.object({
  gameKey: z.enum(gameIds)
});
