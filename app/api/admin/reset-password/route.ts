import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth";
import { fail, ok, zodFail } from "@/lib/http";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { adminResetPasswordSchema } from "@/lib/validation";

function serverError(message: string, details?: unknown) {
  return fail(message, 500, process.env.NODE_ENV === "development" ? details : undefined);
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = adminResetPasswordSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("app_users").update({ password_hash: passwordHash }).eq("id", input.userId);
    if (error) {
      console.error("[admin-reset-password] Could not update app_users with supabaseAdmin", error);
      return serverError(`Could not reset password: ${error.message}`, error);
    }
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return zodFail(error);
    console.error("[admin-reset-password] Unexpected exception", error);
    return serverError(error instanceof Error ? error.message : "Could not reset password.");
  }
}
