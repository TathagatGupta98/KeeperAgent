/**
 * Core HTTP transport for the KeeperKit SDK.
 *
 * Uses the native `fetch` API (Node 18+). Provides:
 *   - Auth header injection via pluggable AuthProvider
 *   - Automatic retry with backoff for safe methods
 *   - Response -> typed error mapping
 *   - Query param serialization
 *   - Generic typed request<T>() method
 *   - Escape-hatch raw() for un-modeled endpoints
 */

import type { AuthProvider } from "./auth.js";
import {
  mapResponseToError,
  RateLimitError,
  KeeperKitError,
} from "./errors.js";
import {
  type RetryPolicy,
  DEFAULT_RETRY_POLICY,
  shouldRetry,
  computeDelay,
  sleep,
} from "./retry.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HttpClientConfig {
  baseUrl?: string;
  auth?: AuthProvider;
  retry?: Partial<RetryPolicy>;
  timeout?: number;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method: HttpMethod;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  /** Override retry policy for this request. */
  retry?: Partial<RetryPolicy>;
  /** AbortSignal for this request. */
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class KeeperKitHttpClient {
  private readonly baseUrl: string;
  private readonly auth?: AuthProvider;
  private readonly retryPolicy: RetryPolicy;
  private readonly timeout: number;

  constructor(config: HttpClientConfig = {}) {
    this.baseUrl = (config.baseUrl ?? "https://app.keeperhub.com/api").replace(
      /\/$/,
      "",
    );
    this.auth = config.auth;
    this.retryPolicy = { ...DEFAULT_RETRY_POLICY, ...config.retry };
    this.timeout = config.timeout ?? 30_000;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Execute a typed request against the KeeperHub API.
   */
  async request<T = unknown>(opts: RequestOptions): Promise<T> {
    const url = this.buildUrl(opts.path, opts.query);
    const policy = { ...this.retryPolicy, ...opts.retry };
    const fetchInit = this.buildInit(opts);

    let lastError: KeeperKitError | undefined;

    for (let attempt = 0; attempt <= policy.maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Merge caller signal with timeout
      const signal = opts.signal
        ? this.mergeSignals(opts.signal, controller.signal)
        : controller.signal;

      try {
        const response = await fetch(url, { ...fetchInit, signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          // 204 No Content
          if (response.status === 204) return undefined as T;
          const text = await response.text();
          if (!text) return undefined as T;
          return JSON.parse(text) as T;
        }

        // Parse error body
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          body = { message: await response.text().catch(() => "") };
        }

        const error = mapResponseToError(response.status, body);

        // Inject Retry-After for rate-limit errors
        if (error instanceof RateLimitError) {
          const retryAfter = response.headers.get("Retry-After");
          if (retryAfter) {
            (error as { retryAfterSeconds?: number }).retryAfterSeconds =
              Number(retryAfter);
          }
        }

        // Should we retry?
        if (shouldRetry(opts.method, response.status, attempt, policy)) {
          const retryAfterHeader = response.headers.get("Retry-After");
          const delay = computeDelay(attempt, policy, retryAfterHeader);
          await sleep(delay);
          lastError = error;
          continue;
        }

        throw error;
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof KeeperKitError) throw err;

        // AbortError from timeout
        if ((err as Error).name === "AbortError") {
          throw new KeeperKitError({
            message: "Request timed out",
            status: 0,
            code: "TIMEOUT",
            isRetryable: true,
          });
        }

        // Wrap network errors in KeeperKitError per SDK contract
        throw new KeeperKitError({
          message: (err as Error).message ?? "Network request failed",
          status: 0,
          code: "NETWORK_ERROR",
          isRetryable: true,
        });
      }
    }

    // Exhausted retries
    throw lastError!;
  }

  /**
   * Escape-hatch for unmodeled endpoints. Returns the raw Response.
   */
  async raw(
    method: HttpMethod,
    path: string,
    opts?: {
      query?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      headers?: Record<string, string>;
    },
  ): Promise<Response> {
    const url = this.buildUrl(path, opts?.query);
    const init = this.buildInit({
      method,
      body: opts?.body,
      headers: opts?.headers,
    });
    return fetch(url, init);
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private buildInit(
    opts: Pick<RequestOptions, "method" | "body" | "headers">,
  ): RequestInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(this.auth?.getHeaders() ?? {}),
      ...(opts.headers ?? {}),
    };

    const init: RequestInit = {
      method: opts.method ?? "GET",
      headers,
    };

    if (opts.body !== undefined) {
      init.body = JSON.stringify(opts.body);
    }

    return init;
  }

  private mergeSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
      signal.addEventListener("abort", () => controller.abort(signal.reason), {
        once: true,
      });
    }
    return controller.signal;
  }
}

/** @deprecated Use KeeperKitHttpClient instead. */
export const KeeperHubHttpClient = KeeperKitHttpClient;
