import type { SessionPayload } from "@/lib/session-core";

type RegisterInput = {
  username: string;
  displayName: string;
  password: string;
};

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type SupabaseResult<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
};

type SelectBuilder<T> = {
  eq: (column: string, value: string) => SelectBuilder<T>;
  maybeSingle: () => Promise<SupabaseResult<T>>;
  single: () => Promise<SupabaseResult<T>>;
};

type InsertBuilder<T> = {
  select: (columns?: string) => SelectBuilder<T>;
};

type TableBuilder<T> = {
  select: (columns?: string) => SelectBuilder<T>;
  insert: (payload: unknown) => InsertBuilder<T>;
};

export type SupabaseRegisterClient = {
  from: <T = unknown>(table: string) => TableBuilder<T>;
};

type CreatedUser = {
  id: string;
  username: string;
  display_name: string | null;
  role: "user" | "admin";
};

export type RegisterAccountResult =
  | { status: 201; user: CreatedUser }
  | { status: number; error: string; debug?: SupabaseErrorLike };

function formatSupabaseError(context: string, error: SupabaseErrorLike | null | undefined) {
  const grantHint =
    error?.code === "42501"
      ? " Run supabase/grants.sql in the Supabase SQL editor. Do not grant anon access to app_users."
      : "";
  return {
    message: `${context}: ${error?.message || "Unknown Supabase error."}${grantHint}`,
    debug: {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint
    }
  };
}

export async function registerAccount({
  input,
  supabase,
  hashPassword,
  createSession
}: {
  input: RegisterInput;
  supabase: SupabaseRegisterClient;
  hashPassword: (password: string) => Promise<string>;
  createSession: (payload: SessionPayload) => Promise<void>;
}): Promise<RegisterAccountResult> {
  const existingResult = await supabase
    .from<{ id: string }>("app_users")
    .select("id")
    .eq("username", input.username)
    .maybeSingle();

  if (existingResult.error) {
    const formatted = formatSupabaseError("Could not check duplicate username", existingResult.error);
    return { status: 500, error: formatted.message, debug: formatted.debug };
  }

  if (existingResult.data) {
    return { status: 409, error: "Username is already taken." };
  }

  const passwordHash = await hashPassword(input.password);
  const userResult = await supabase
    .from<CreatedUser>("app_users")
    .insert({
      username: input.username,
      display_name: input.displayName,
      avatar_url: null,
      password_hash: passwordHash,
      role: "user"
    })
    .select("id, username, display_name, role")
    .single();

  if (userResult.error || !userResult.data) {
    if (userResult.error?.code === "23505") {
      return { status: 409, error: "Username is already taken.", debug: userResult.error };
    }
    const formatted = formatSupabaseError("Could not create app user", userResult.error);
    return { status: 500, error: formatted.message, debug: formatted.debug };
  }

  if (userResult.data.display_name !== input.displayName) {
    return {
      status: 500,
      error: "Could not create app user: display name was not saved correctly.",
      debug: {
        message: `Expected display_name "${input.displayName}", got "${userResult.data.display_name ?? "NULL"}".`
      }
    };
  }

  await createSession({
    userId: userResult.data.id,
    username: userResult.data.username,
    role: userResult.data.role
  });

  return { status: 201, user: userResult.data };
}
