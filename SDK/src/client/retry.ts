/**
 * Configurable retry logic with exponential backoff + jitter.
 *
 * Design decisions:
 *   - Only GET requests retry automatically by default.
 *   - State-changing methods (POST/PUT/PATCH/DELETE) require `retryWrites: true`.
 *   - 429 responses respect the `Retry-After` header.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetryPolicy {
  /** Maximum number of retry attempts (default: 5). */
  maxAttempts: number;
  /** Base delay in milliseconds before first retry (default: 1000). */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds (default: 30000). */
  maxDelayMs: number;
  /** If true, retries are applied to state-changing methods too (default: false). */
  retryWrites: boolean;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryWrites: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Determines whether a request with the given method and status should be retried.
 */
export function shouldRetry(
  method: string,
  status: number,
  attempt: number,
  policy: RetryPolicy,
): boolean {
  if (attempt >= policy.maxAttempts) return false;
  if (!policy.retryWrites && !SAFE_METHODS.has(method.toUpperCase()))
    return false;

  // Retry on rate-limit or server errors
  return status === 429 || status >= 500;
}

/**
 * Computes delay in ms for the given attempt using exponential backoff + jitter.
 * If the server returned a Retry-After header, that value takes precedence.
 */
export function computeDelay(
  attempt: number,
  policy: RetryPolicy,
  retryAfterHeader?: string | null,
): number {
  // Honour Retry-After (seconds) from the server
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, policy.maxDelayMs);
    }
  }

  // Exponential backoff: base * 2^attempt + random jitter
  const exponential = policy.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * policy.baseDelayMs;
  return Math.min(exponential + jitter, policy.maxDelayMs);
}

/**
 * Sleeps for the specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
