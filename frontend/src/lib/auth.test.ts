import { describe, expect, it } from "vitest";
import { checkCredentials } from "@/lib/auth";

describe("checkCredentials", () => {
  it("accepts the demo credentials", () => {
    expect(checkCredentials("user", "password")).toBe(true);
  });

  it("rejects wrong credentials", () => {
    expect(checkCredentials("user", "wrong")).toBe(false);
    expect(checkCredentials("admin", "password")).toBe(false);
    expect(checkCredentials("", "")).toBe(false);
  });
});
