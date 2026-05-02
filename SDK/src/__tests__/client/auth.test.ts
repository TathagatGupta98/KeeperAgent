/**
 * Auth provider tests.
 */

import { describe, it, expect } from "vitest";
import { ApiKeyAuth, OAuthBearerAuth, SessionAuth } from "../../client/auth.js";

describe("ApiKeyAuth", () => {
  it("returns correct Authorization header for valid key", () => {
    const auth = new ApiKeyAuth("kh_test_abc123");
    expect(auth.getHeaders()).toEqual({
      Authorization: "Bearer kh_test_abc123",
    });
  });

  it("throws on empty key", () => {
    expect(() => new ApiKeyAuth("")).toThrow("Invalid KeeperKit API key");
  });

  it('throws on key without "kh_" prefix', () => {
    expect(() => new ApiKeyAuth("sk_wrong_prefix")).toThrow(
      "Invalid KeeperKit API key",
    );
  });

  it("throws on key that is just whitespace", () => {
    expect(() => new ApiKeyAuth("   ")).toThrow("Invalid KeeperKit API key");
  });
});

describe("OAuthBearerAuth", () => {
  it("returns correct Authorization header", () => {
    const auth = new OAuthBearerAuth("eyJhbGciOiJSUzI1NiJ9...");
    expect(auth.getHeaders()).toEqual({
      Authorization: "Bearer eyJhbGciOiJSUzI1NiJ9...",
    });
  });

  it("throws on empty token", () => {
    expect(() => new OAuthBearerAuth("")).toThrow(
      "OAuth bearer token must not be empty",
    );
  });
});

describe("SessionAuth", () => {
  it("returns correct Cookie header", () => {
    const auth = new SessionAuth("session_id=abc123; path=/");
    expect(auth.getHeaders()).toEqual({
      Cookie: "session_id=abc123; path=/",
    });
  });

  it("throws on empty cookie", () => {
    expect(() => new SessionAuth("")).toThrow(
      "Session cookie must not be empty",
    );
  });
});
