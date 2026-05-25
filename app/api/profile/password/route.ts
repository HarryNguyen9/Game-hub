import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, zodFail } from "@/lib/http";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { changePasswordSchema } from "@/lib/validation";

function serverError(message: string, details?: unknown) {
  return fail(message, 500, process.env.NODE_ENV === "development" ? details : undefined);
}

export async function PUT(request: Request) {
  try {
    const session = await requireUser();
    const input = changePasswordSchema.parse(await request.json());
    const supabase = createSupabaseAdmin();
    const { data: user, error: readError } = await supabase
      .from("app_users")
      .select("password_hash")
      .eq("id", session.userId)
      .single();

    if (readError) {
      console.error("[change-password] Could not read app_users with supabaseAdmin", readError);
      return serverError(`Could not read app_users: ${readError.message}`, readError);
    }

    if (!user || !(await bcrypt.compare(input.oldPassword, user.password_hash))) {
      return fail("Old password is not correct.", 401);
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    const { error } = await supabase.from("app_users").update({ password_hash: passwordHash }).eq("id", session.userId);
    if (error) {
      console.error("[change-password] Could not update app_users with supabaseAdmin", error);
      return serverError(`Could not update password: ${error.message}`, error);
    }
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return zodFail(error);
    console.error("[change-password] Unexpected exception", error);
    return serverError(error instanceof Error ? error.message : "Could not change password.");
  }
}
