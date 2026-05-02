/**
 * Error hierarchy and factory tests.
 */

import { describe, it, expect } from "vitest";
import {
  KeeperKitError,
  AuthError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  SpendingCapError,
  PaymentRequiredError,
  ExecutionError,
  ServerError,
  mapResponseToError,
} from "../../client/errors.js";

describe("Error classes", () => {
  it("KeeperKitError carries status, code, isRetryable, body", () => {
    const err = new KeeperKitError({
      message: "test",
      status: 418,
      code: "TEAPOT",
      isRetryable: false,
      body: { foo: "bar" },
    });
    expect(err.message).toBe("test");
    expect(err.status).toBe(418);
    expect(err.code).toBe("TEAPOT");
    expect(err.isRetryable).toBe(false);
    expect(err.body).toEqual({ foo: "bar" });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(KeeperKitError);
  });

  it("AuthError defaults to 401 and isRetryable=false", () => {
    const err = new AuthError("invalid key");
    expect(err.status).toBe(401);
    expect(err.isRetryable).toBe(false);
    expect(err.name).toBe("AuthError");
  });

  it("RateLimitError carries retryAfterSeconds and isRetryable=true", () => {
    const err = new RateLimitError("too many requests", 30);
    expect(err.status).toBe(429);
    expect(err.isRetryable).toBe(true);
    expect(err.retryAfterSeconds).toBe(30);
  });

  it("SpendingCapError is not retryable", () => {
    const err = new SpendingCapError("exceeded");
    expect(err.status).toBe(422);
    expect(err.isRetryable).toBe(false);
  });

  it("ServerError is retryable", () => {
    const err = new ServerError("internal", 502);
    expect(err.status).toBe(502);
    expect(err.isRetryable).toBe(true);
  });
});

describe("mapResponseToError", () => {
  it("maps 400 → ValidationError", () => {
    const err = mapResponseToError(400, { message: "bad input" });
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.message).toBe("bad input");
  });

  it("maps 401 → AuthError", () => {
    const err = mapResponseToError(401, { message: "unauthorized" });
    expect(err).toBeInstanceOf(AuthError);
  });

  it("maps 403 → AuthError", () => {
    const err = mapResponseToError(403, { message: "forbidden" });
    expect(err).toBeInstanceOf(AuthError);
  });

  it("maps 402 → PaymentRequiredError", () => {
    const err = mapResponseToError(402, { message: "payment required" });
    expect(err).toBeInstanceOf(PaymentRequiredError);
  });

  it("maps 404 → NotFoundError", () => {
    const err = mapResponseToError(404, { message: "not found" });
    expect(err).toBeInstanceOf(NotFoundError);
  });

  it("maps 422 with SPENDING_CAP_EXCEEDED → SpendingCapError", () => {
    const err = mapResponseToError(422, {
      message: "cap exceeded",
      code: "SPENDING_CAP_EXCEEDED",
    });
    expect(err).toBeInstanceOf(SpendingCapError);
  });

  it("maps 422 without specific code → ValidationError", () => {
    const err = mapResponseToError(422, { message: "unprocessable" });
    expect(err).toBeInstanceOf(ValidationError);
  });

  it("maps 429 → RateLimitError", () => {
    const err = mapResponseToError(429, { message: "too many" });
    expect(err).toBeInstanceOf(RateLimitError);
  });

  it("maps 500 → ServerError", () => {
    const err = mapResponseToError(500, { message: "oops" });
    expect(err).toBeInstanceOf(ServerError);
  });

  it("maps 503 → ServerError", () => {
    const err = mapResponseToError(503, { message: "unavailable" });
    expect(err).toBeInstanceOf(ServerError);
  });

  it("uses HTTP status as fallback message when body has no message", () => {
    const err = mapResponseToError(500, {});
    expect(err.message).toBe("HTTP 500");
  });
});
