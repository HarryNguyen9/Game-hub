import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { fail, ok, zodFail } from "@/lib/http";
import { registerSchema } from "@/lib/validation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { setSession } from "@/lib/session";
import { envDiagnostics, getMissingServerEnv } from "@/lib/server-env";
import { registerAccount, type SupabaseRegisterClient } from "@/lib/auth/register-account";

function serverError(message: string, status = 500, details?: unknown) {
  return fail(message, status, process.env.NODE_ENV === "development" ? details : undefined);
}

export async function POST(request: Request) {
  try {
    const missingEnv = getMissingServerEnv();
    if (missingEnv.length > 0) {
      const message = missingEnv.includes("SUPABASE_SERVICE_ROLE_KEY")
        ? "Missing SUPABASE_SERVICE_ROLE_KEY. Server auth routes require service role key."
        : `Missing required env vars: ${missingEnv.join(", ")}`;
      console.error("[register] Missing required env vars", {
        missingEnv,
        env: envDiagnostics()
      });
      return serverError(message, 500, envDiagnostics());
    }

    const input = registerSchema.parse(await request.json());
    console.info("[register] Validated register input", {
      username: input.username,
      displayName: input.displayName
    });
    const supabase = createSupabaseAdmin();
    const result = await registerAccount({
      input,
      supabase: supabase as unknown as SupabaseRegisterClient,
      hashPassword: (password) => bcrypt.hash(password, 12),
      createSession: setSession
    });

    if ("error" in result) {
      console.error("[register] Register failed", {
        status: result.status,
        error: result.error,
        debug: result.debug,
        env: envDiagnostics(),
        schema: {
          usersTable: "app_users",
          userFields: ["username", "display_name", "avatar_url", "password_hash", "role"]
        }
      });
      return serverError(result.error, result.status, result.debug);
    }

    return ok({ user: result.user }, 201);
  } catch (error) {
    if (error instanceof ZodError) return zodFail(error);
    console.error("[register] Unexpected register exception", {
      error,
      env: envDiagnostics()
    });
    const message = error instanceof Error ? error.message : "Could not register.";
    return serverError(message, 500);
  }
}
