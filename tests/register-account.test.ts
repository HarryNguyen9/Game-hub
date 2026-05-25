import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerAccount } from "@/lib/auth/register-account";

type QueryResult = { data?: unknown; error?: unknown };

function createSupabaseMock(results: QueryResult[]) {
  const calls: Array<{ table: string; action: string; payload?: unknown }> = [];

  function nextResult() {
    return results.shift() || { data: null, error: null };
  }

  return {
    calls,
    from(table: string) {
      const builder = {
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        maybeSingle: async () => nextResult(),
        single: async () => nextResult(),
        insert(payload: unknown) {
          calls.push({ table, action: "insert", payload });
          return builder;
        }
      };
      return builder;
    }
  };
}

describe("registerAccount", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a 409 result for duplicate usernames", async () => {
    const supabase = createSupabaseMock([{ data: { id: "existing-user" }, error: null }]);

    const result = await registerAccount({
      input: { username: "player", displayName: "Player One", password: "secret123" },
      supabase,
      hashPassword: async () => "hash",
      createSession: async () => undefined
    });

    expect(result.status).toBe(409);
    expect(result.error).toContain("already taken");
  });

  it("creates user with profile fields and session when Supabase succeeds", async () => {
    const createSession = vi.fn(async () => undefined);
    const supabase = createSupabaseMock([
      { data: null, error: null },
      { data: { id: "user-1", username: "player", role: "user", display_name: "Player One" }, error: null }
    ]);

    const result = await registerAccount({
      input: { username: "player", displayName: "Player One", password: "secret123" },
      supabase,
      hashPassword: async () => "hashed-password",
      createSession
    });

    expect(result.status).toBe(201);
    expect(supabase.calls).toEqual([
      {
        table: "app_users",
        action: "insert",
        payload: {
          username: "player",
          display_name: "Player One",
          avatar_url: null,
          password_hash: "hashed-password",
          role: "user"
        }
      }
    ]);
    expect(createSession).toHaveBeenCalledWith({ userId: "user-1", username: "player", role: "user" });
  });

  it("returns a clear error when app user insert fails", async () => {
    const supabase = createSupabaseMock([
      { data: null, error: null },
      { data: null, error: { message: "app_users display_name missing", code: "23502" } }
    ]);

    const result = await registerAccount({
      input: { username: "player", displayName: "Player One", password: "secret123" },
      supabase,
      hashPassword: async () => "hashed-password",
      createSession: async () => undefined
    });

    expect(result.status).toBe(500);
    expect(result.error).toContain("app user");
    expect(result.debug).toMatchObject({ code: "23502" });
  });

  it("fails clearly if Supabase returns an app user without display name", async () => {
    const supabase = createSupabaseMock([
      { data: null, error: null },
      { data: { id: "user-1", username: "player", role: "user", display_name: null }, error: null }
    ]);

    const result = await registerAccount({
      input: { username: "player", displayName: "Player One", password: "secret123" },
      supabase,
      hashPassword: async () => "hashed-password",
      createSession: async () => undefined
    });

    expect(result.status).toBe(500);
    expect(result.error).toContain("display name was not saved");
  });
});
