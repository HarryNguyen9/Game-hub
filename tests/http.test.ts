import { describe, expect, it } from "vitest";
import { ZodError, z } from "zod";
import { firstZodMessage } from "@/lib/http";

describe("http validation helpers", () => {
  it("returns the first field-specific zod error message", () => {
    const schema = z.object({
      password: z.string().min(6, "Password must be at least 6 characters.")
    });

    let error: ZodError | undefined;
    const result = schema.safeParse({ password: "1234" });
    if (!result.success) {
      error = result.error;
    }

    expect(firstZodMessage(error as ZodError)).toBe("Password must be at least 6 characters.");
  });
});
