import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const passwordHash = await bcrypt.hash("admin", 12);
const { data: existing } = await supabase.from("app_users").select("id").eq("username", "admin").maybeSingle();

if (existing) {
  await supabase
    .from("app_users")
    .update({ password_hash: passwordHash, role: "admin", display_name: "Admin" })
    .eq("id", existing.id);
  console.log("Updated admin account: admin/admin");
} else {
  const { data: user, error } = await supabase
    .from("app_users")
    .insert({ username: "admin", display_name: "Admin", avatar_url: null, password_hash: passwordHash, role: "admin" })
    .select("id")
    .single();

  if (error || !user) {
    throw new Error(error?.message || "Could not create admin.");
  }
  console.log("Created admin account: admin/admin");
}
