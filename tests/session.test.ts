import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session-core";

describe("session tokens", () => {
  it("round-trips signed user payloads", async () => {
    const secret = "test-secret-with-enough-length";
    const token = await createSessionToken(
      { userId: "6f611f90-bdc9-4d77-8cf5-e98ed709aa45", username: "admin", role: "admin" },
      secret
    );

    const payload = await verifySessionToken(token, secret);

    expect(payload?.username).toBe("admin");
    expect(payload?.role).toBe("admin");
  });

  it("returns null for invalid tokens", async () => {
    const payload = await verifySessionToken("broken", "test-secret-with-enough-length");
    expect(payload).toBeNull();
  });
});
