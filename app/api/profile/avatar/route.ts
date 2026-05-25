import { AVATAR_BUCKET } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { createServiceClient } from "@/lib/supabase/server";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  const session = await requireUser();
  const form = await request.formData();
  const file = form.get("avatar");

  if (!(file instanceof File)) {
    return fail("Avatar file is required.", 400);
  }

  if (!allowedTypes.has(file.type)) {
    return fail("Avatar must be PNG, JPEG, WEBP, or GIF.", 422);
  }

  if (file.size > 2 * 1024 * 1024) {
    return fail("Avatar must be smaller than 2MB.", 422);
  }

  const supabase = createServiceClient();
  const extension = file.name.split(".").pop() || "png";
  const path = `${session.userId}/${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true
  });

  if (uploadError) {
    return fail("Could not upload avatar.", 500);
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const { error: profileError } = await supabase
    .from("app_users")
    .update({ avatar_url: data.publicUrl })
    .eq("id", session.userId);

  if (profileError) return fail("Could not update avatar.", 500);
  return ok({ avatarUrl: data.publicUrl });
}
