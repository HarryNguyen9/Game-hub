import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "@/lib/env";

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: string };
  } catch {
    return null;
  }
}

export function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY. Server auth routes require service role key.");
  }

  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "Invalid SUPABASE_SERVICE_ROLE_KEY. Server auth routes require the Supabase service role secret key, not the publishable/anon key."
    );
  }

  const payload = decodeJwtPayload(key);
  if (payload?.role && payload.role !== "service_role") {
    throw new Error(
      `Invalid SUPABASE_SERVICE_ROLE_KEY role "${payload.role}". Server auth routes require the Supabase service_role key, not the anon key.`
    );
  }

  return key;
}

export function createSupabaseAdmin() {
  return createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        "X-Client-Info": "game-hub-server-auth"
      }
    }
  });
}

export const supabaseAdmin = createSupabaseAdmin;
