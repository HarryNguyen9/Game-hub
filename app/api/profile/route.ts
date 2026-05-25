import { ZodError } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok, zodFail } from "@/lib/http";
import { createServiceClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation";

export async function PUT(request: Request) {
  try {
    const session = await requireUser();
    const input = profileSchema.parse(await request.json());
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("app_users")
      .update({ display_name: input.displayName })
      .eq("id", session.userId);

    if (error) return fail("Could not update profile.", 500);
    return ok({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return zodFail(error);
    return fail("Could not update profile.", 500);
  }
}
