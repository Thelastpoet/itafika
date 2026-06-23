import { describe, expect, it } from "vitest";

import { buildAuthorizedInit, friendlyError } from "./api.js";

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

describe("friendlyError", () => {
  it("maps a known error code to friendly copy", () => {
    const message = friendlyError(409, JSON.stringify({ error: { code: "row_exists", message: "row exists" } }));
    expect(message).toContain("already exists");
  });

  it("falls back to the server message when the code is unknown", () => {
    expect(friendlyError(400, JSON.stringify({ error: { code: "weird", message: "Specific detail" } }))).toBe("Specific detail");
  });

  it("uses a status-based message when the body is not JSON", () => {
    expect(friendlyError(401, "<html>")).toContain("sign-in token");
    expect(friendlyError(500, "")).toBe("Something went wrong. Please try again.");
  });
});
