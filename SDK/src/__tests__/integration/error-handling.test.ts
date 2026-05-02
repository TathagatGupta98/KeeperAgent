// SDK surface tested: Error handling integration
//
// Maps to claude_test.md Phase 2.5 API route error handling:
//   - 401 for unauthenticated request
//   - 403 for unauthorized access
//   - 404 for non-existent resources
//   - 429 for rate limiting
//   - 422 for spending cap exceeded
//   - 400 for validation errors
//   - 500 for server errors with retry

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createKeeperHubClient } from "../../index.js";
import {
  AuthError,
  NotFoundError,
  RateLimitError,
  SpendingCapError,
  ValidationError,
  ServerError,
  PaymentRequiredError,
  KeeperKitError,
} from "../../client/errors.js";
import type { KeeperHubClient } from "../../index.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SDK error handling (mocked API)", () => {
  let client: KeeperHubClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = createKeeperHubClient({
      apiKey: "kh_test_errors",
      retry: { maxAttempts: 0 },
    });
  });

  it("throws AuthError on 401 unauthenticated request", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Invalid API key" }, 401),
    );

    try {
      await client.workflows.list();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect(err).toBeInstanceOf(KeeperKitError);
      expect((err as AuthError).status).toBe(401);
      expect((err as AuthError).isRetryable).toBe(false);
    }
  });

  it("throws AuthError on 403 forbidden access", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "You do not own this workflow" }, 403),
    );

    try {
      await client.workflows.get("wf_other_user");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect((err as AuthError).status).toBe(403);
      expect((err as AuthError).message).toBe("You do not own this workflow");
    }
  });

  it("throws NotFoundError on 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Workflow not found" }, 404),
    );

    try {
      await client.workflows.get("wf_nonexistent");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).status).toBe(404);
    }
  });

  it("throws RateLimitError on 429 with retryable flag", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Too many requests" }, 429),
    );

    try {
      await client.workflows.list();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).isRetryable).toBe(true);
    }
  });

  it("throws SpendingCapError on 422 with SPENDING_CAP_EXCEEDED code", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        { message: "Monthly spending cap exceeded", code: "SPENDING_CAP_EXCEEDED" },
        422,
      ),
    );

    try {
      await client.workflows.execute("wf_1");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SpendingCapError);
      expect((err as SpendingCapError).isRetryable).toBe(false);
    }
  });

  it("throws ValidationError on 400 with field-level details", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          message: "Invalid request body",
          errors: [{ field: "name", message: "name is required" }],
        },
        400,
      ),
    );

    try {
      await client.workflows.create({ name: "", nodes: [], edges: [] });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).status).toBe(400);
    }
  });

  it("throws ValidationError on 422 without spending cap code", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Unprocessable entity" }, 422),
    );

    try {
      await client.workflows.create({ name: "", nodes: [], edges: [] });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      // ValidationError constructor hardcodes status=400 regardless of HTTP status
      expect((err as ValidationError).status).toBe(400);
    }
  });

  it("throws PaymentRequiredError on 402 through request()", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Payment required" }, 402),
    );

    try {
      await client.workflows.get("wf_paid");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PaymentRequiredError);
    }
  });

  it("throws ServerError on 500 with retryable flag", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Internal server error" }, 500),
    );

    try {
      await client.workflows.list();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ServerError);
      expect((err as ServerError).isRetryable).toBe(true);
    }
  });

  it("throws ServerError on 503 service unavailable", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "Service unavailable" }, 503),
    );

    try {
      await client.workflows.list();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ServerError);
      expect((err as ServerError).status).toBe(503);
    }
  });

  it("all SDK errors extend KeeperKitError base class", async () => {
    const errorCases = [
      { status: 400, expected: ValidationError },
      { status: 401, expected: AuthError },
      { status: 403, expected: AuthError },
      { status: 404, expected: NotFoundError },
      { status: 429, expected: RateLimitError },
      { status: 500, expected: ServerError },
    ];

    for (const { status, expected } of errorCases) {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ message: `Error ${status}` }, status),
      );

      try {
        await client.workflows.list();
        expect.fail(`Should have thrown for status ${status}`);
      } catch (err) {
        expect(err).toBeInstanceOf(KeeperKitError);
        expect(err).toBeInstanceOf(expected);
      }
    }
  });
});
