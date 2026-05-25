import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { fail, ok, zodFail } from "@/lib/http";
import { loginSchema } from "@/lib/validation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { setSession } from "@/lib/session";

function serverError(message: string, details?: unknown) {
  return fail(message, 500, process.env.NODE_ENV === "development" ? details : undefined);
}

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const supabase = createSupabaseAdmin();
    const { data: user, error } = await supabase
      .from("app_users")
      .select("id, username, password_hash, role")
      .eq("username", input.username)
      .maybeSingle();

    if (error) {
      console.error("[login] Could not query app_users with supabaseAdmin", error);
      return serverError(`Could not query app_users: ${error.message}`, error);
    }

    if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
      return fail("Invalid username or password.", 401);
    }

    await setSession({ userId: user.id, username: user.username, role: user.role });
    return ok({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    if (error instanceof ZodError) return zodFail(error);
    console.error("[login] Unexpected login exception", error);
    return serverError(error instanceof Error ? error.message : "Could not login.");
  }
}
