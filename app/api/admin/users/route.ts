import { requireAdmin } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, username, display_name, avatar_url, role, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return fail("Could not load users.", 500);

  const normalizedQuery = query?.toLowerCase();
  const users = normalizedQuery
    ? (data || []).filter((user) => {
        return (
          user.username.toLowerCase().includes(normalizedQuery) ||
          (user.display_name || "").toLowerCase().includes(normalizedQuery)
        );
      })
    : data || [];

  return ok({ users });
}
