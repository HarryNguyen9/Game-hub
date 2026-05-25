import { getCurrentUserWithProfile } from "@/lib/auth";
import { requiredEnv } from "@/lib/env";
import { ok } from "@/lib/http";
import { createSocketToken } from "@/lib/socket-token";

export async function GET() {
  const user = await getCurrentUserWithProfile();
  const token = await createSocketToken(
    {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role
    },
    requiredEnv("SESSION_SECRET")
  );

  return ok({ token });
}
