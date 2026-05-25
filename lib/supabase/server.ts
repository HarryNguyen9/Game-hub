import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";

export function createServiceClient() {
  return createSupabaseAdmin();
}
