/**
 * HTTP client tests with mocked fetch.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeeperKitHttpClient } from "../../client/http.js";
import { ApiKeyAuth } from "../../client/auth.js";
import { AuthError, NotFoundError, ServerError } from "../../client/errors.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("KeeperKitHttpClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("builds URL with base URL and path", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const client = new KeeperKitHttpClient({
      baseUrl: "https://example.com/api",
    });

    await client.request({ method: "GET", path: "/workflows" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toBe("https://example.com/api/workflows");
  });

  it("serializes query parameters", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    const client = new KeeperKitHttpClient();
    await client.request({
      method: "GET",
      path: "/workflows",
      query: { projectId: "proj_1", tagId: undefined },
    });

    const url = new URL(mockFetch.mock.calls[0]![0] as string);
    expect(url.searchParams.get("projectId")).toBe("proj_1");
    expect(url.searchParams.has("tagId")).toBe(false);
  });

  it("injects auth headers", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    const client = new KeeperKitHttpClient({
      auth: new ApiKeyAuth("kh_test_key"),
    });
    await client.request({ method: "GET", path: "/test" });

    const init = mockFetch.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer kh_test_key");
  });

  it("sends JSON body for POST requests", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: "wf_1" }));

    const client = new KeeperKitHttpClient();
    await client.request({
      method: "POST",
      path: "/workflows",
      body: { name: "Test Workflow" },
    });

    const init = mockFetch.mock.calls[0]![1] as RequestInit;
    expect(init.body).toBe(JSON.stringify({ name: "Test Workflow" }));
  });

  it("returns parsed JSON on success", async () => {
    const data = { id: "wf_1", name: "My Workflow" };
    mockFetch.mockResolvedValueOnce(jsonResponse(data));

    const client = new KeeperKitHttpClient();
    const result = await client.request({ method: "GET", path: "/test" });
    expect(result).toEqual(data);
  });

  it("returns undefined for 204 No Content", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = new KeeperKitHttpClient();
    const result = await client.request({ method: "DELETE", path: "/test" });
    expect(result).toBeUndefined();
  });

  it("throws NotFoundError on 404", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "workflow not found" }, 404),
    );

    const client = new KeeperKitHttpClient();
    await expect(
      client.request({ method: "GET", path: "/workflows/nonexistent" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws AuthError on 401", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "invalid api key" }, 401),
    );

    const client = new KeeperKitHttpClient();
    await expect(
      client.request({ method: "GET", path: "/test" }),
    ).rejects.toThrow(AuthError);
  });

  it("retries GET on 500 and succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ message: "server error" }, 500))
      .mockResolvedValueOnce(jsonResponse({ success: true }));

    const client = new KeeperKitHttpClient({
      retry: { baseDelayMs: 10, maxDelayMs: 50 },
    });

    const result = await client.request({ method: "GET", path: "/test" });
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry POST on 500 by default", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ message: "server error" }, 500),
    );

    const client = new KeeperKitHttpClient();
    await expect(
      client.request({ method: "POST", path: "/test", body: {} }),
    ).rejects.toThrow(ServerError);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("raw() returns the Response object directly", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ raw: true }));

    const client = new KeeperKitHttpClient();
    const response = await client.raw("GET", "/test");
    expect(response).toBeInstanceOf(Response);
    const body = await response.json();
    expect(body).toEqual({ raw: true });
  });
});
