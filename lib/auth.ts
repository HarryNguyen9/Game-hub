import "server-only";

import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.role !== "admin") {
    redirect("/dashboard");
  }
  return session;
}

export async function getCurrentUserWithProfile() {
  const session = await requireUser();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("id, username, display_name, avatar_url, role")
    .eq("id", session.userId)
    .single();

  if (error || !data) {
    redirect("/login");
  }

  return {
    id: data.id,
    username: data.username,
    role: data.role,
    displayName: data.display_name || data.username,
    avatarUrl: data.avatar_url || null
  };
}
