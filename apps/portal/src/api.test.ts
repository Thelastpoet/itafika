import { describe, expect, it } from "vitest";

import { buildAuthorizedInit } from "./api.js";

describe("buildAuthorizedInit", () => {
  it("adds bearer auth and JSON content type when a body is present", () => {
    const init = buildAuthorizedInit("token-123", {
      method: "POST",
      body: JSON.stringify({ hello: "world" }),
    });

    expect(init.headers).toBeInstanceOf(Headers);
    expect((init.headers as Headers).get("authorization")).toBe("Bearer token-123");
    expect((init.headers as Headers).get("content-type")).toBe("application/json");
  });

  it("preserves an explicit content type", () => {
    const init = buildAuthorizedInit("token-123", {
      headers: { "content-type": "text/plain" },
      body: "raw",
    });

    expect((init.headers as Headers).get("authorization")).toBe("Bearer token-123");
    expect((init.headers as Headers).get("content-type")).toBe("text/plain");
  });
});
