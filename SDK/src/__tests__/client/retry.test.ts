/**
 * Retry logic tests.
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_RETRY_POLICY,
  shouldRetry,
  computeDelay,
} from "../../client/retry.js";

describe("shouldRetry", () => {
  const policy = DEFAULT_RETRY_POLICY;

  it("retries GET on 429", () => {
    expect(shouldRetry("GET", 429, 0, policy)).toBe(true);
  });

  it("retries GET on 500", () => {
    expect(shouldRetry("GET", 500, 0, policy)).toBe(true);
  });

  it("retries GET on 503", () => {
    expect(shouldRetry("GET", 503, 0, policy)).toBe(true);
  });

  it("does NOT retry GET on 400", () => {
    expect(shouldRetry("GET", 400, 0, policy)).toBe(false);
  });

  it("does NOT retry POST without retryWrites", () => {
    expect(shouldRetry("POST", 500, 0, policy)).toBe(false);
  });

  it("retries POST when retryWrites is true", () => {
    expect(shouldRetry("POST", 500, 0, { ...policy, retryWrites: true })).toBe(
      true,
    );
  });

  it("does NOT retry when attempts exhausted", () => {
    expect(shouldRetry("GET", 500, 5, policy)).toBe(false);
  });

  it("does NOT retry DELETE without retryWrites", () => {
    expect(shouldRetry("DELETE", 429, 0, policy)).toBe(false);
  });

  it("does NOT retry PATCH without retryWrites", () => {
    expect(shouldRetry("PATCH", 500, 0, policy)).toBe(false);
  });
});

describe("computeDelay", () => {
  const policy = DEFAULT_RETRY_POLICY;

  it("respects Retry-After header (seconds)", () => {
    const delay = computeDelay(0, policy, "5");
    expect(delay).toBe(5000);
  });

  it("caps Retry-After to maxDelayMs", () => {
    const delay = computeDelay(0, policy, "60");
    expect(delay).toBe(policy.maxDelayMs);
  });

  it("uses exponential backoff when no Retry-After", () => {
    // Attempt 0: base * 2^0 + jitter ≈ 1000–2000
    const delay = computeDelay(0, policy, null);
    expect(delay).toBeGreaterThanOrEqual(policy.baseDelayMs);
    expect(delay).toBeLessThanOrEqual(policy.baseDelayMs * 2 + policy.baseDelayMs);
  });

  it("increases delay with each attempt", () => {
    const delay0 = computeDelay(0, { ...policy, baseDelayMs: 100 }, null);
    const delay2 = computeDelay(2, { ...policy, baseDelayMs: 100 }, null);
    // delay2 should typically be larger, though jitter adds randomness
    // At attempt 2: 100 * 2^2 = 400 base + jitter up to 100
    expect(delay2).toBeGreaterThanOrEqual(400);
  });

  it("caps at maxDelayMs", () => {
    const delay = computeDelay(20, policy, null);
    expect(delay).toBeLessThanOrEqual(policy.maxDelayMs);
  });

  it("ignores non-numeric Retry-After", () => {
    const delay = computeDelay(0, policy, "not-a-number");
    // Should fall through to exponential backoff
    expect(delay).toBeGreaterThanOrEqual(policy.baseDelayMs);
  });
});
