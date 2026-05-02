/**
 * KeeperKit SDK Error Hierarchy
 *
 * All SDK errors extend KeeperKitError and carry:
 *   - HTTP status code
 *   - Machine-readable error code
 *   - Human-readable message
 *   - Retryability hint
 */

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export class KeeperKitError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly isRetryable: boolean;
  public readonly body?: unknown;

  constructor(opts: {
    message: string;
    status: number;
    code: string;
    isRetryable: boolean;
    body?: unknown;
  }) {
    super(opts.message);
    this.name = "KeeperKitError";
    this.status = opts.status;
    this.code = opts.code;
    this.isRetryable = opts.isRetryable;
    this.body = opts.body;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/** @deprecated Use KeeperKitError instead. */
export const KeeperHubError = KeeperKitError;

// ---------------------------------------------------------------------------
// Subclasses
// ---------------------------------------------------------------------------

export class AuthError extends KeeperKitError {
  constructor(message: string, status: number = 401, body?: unknown) {
    super({ message, status, code: "AUTH_ERROR", isRetryable: false, body });
    this.name = "AuthError";
  }
}

export class ValidationError extends KeeperKitError {
  constructor(message: string, body?: unknown) {
    super({
      message,
      status: 400,
      code: "VALIDATION_ERROR",
      isRetryable: false,
      body,
    });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends KeeperKitError {
  constructor(message: string, body?: unknown) {
    super({
      message,
      status: 404,
      code: "NOT_FOUND",
      isRetryable: false,
      body,
    });
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends KeeperKitError {
  public readonly retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number, body?: unknown) {
    super({
      message,
      status: 429,
      code: "RATE_LIMIT_EXCEEDED",
      isRetryable: true,
      body,
    });
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class SpendingCapError extends KeeperKitError {
  constructor(message: string, body?: unknown) {
    super({
      message,
      status: 422,
      code: "SPENDING_CAP_EXCEEDED",
      isRetryable: false,
      body,
    });
    this.name = "SpendingCapError";
  }
}

export class PaymentRequiredError extends KeeperKitError {
  public readonly paymentChallenge?: unknown;

  constructor(message: string, paymentChallenge?: unknown, body?: unknown) {
    super({
      message,
      status: 402,
      code: "PAYMENT_REQUIRED",
      isRetryable: false,
      body,
    });
    this.name = "PaymentRequiredError";
    this.paymentChallenge = paymentChallenge;
  }
}

export class ExecutionError extends KeeperKitError {
  constructor(message: string, status: number = 500, body?: unknown) {
    super({
      message,
      status,
      code: "EXECUTION_ERROR",
      isRetryable: false,
      body,
    });
    this.name = "ExecutionError";
  }
}

export class ServerError extends KeeperKitError {
  constructor(message: string, status: number = 500, body?: unknown) {
    super({
      message,
      status,
      code: "SERVER_ERROR",
      isRetryable: true,
      body,
    });
    this.name = "ServerError";
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Maps an HTTP response status + parsed body to the appropriate SDK error.
 */
export function mapResponseToError(
  status: number,
  body: unknown,
): KeeperKitError {
  const message =
    typeof body === "object" && body !== null && "message" in body
      ? String((body as Record<string, unknown>).message)
      : `HTTP ${status}`;

  const code =
    typeof body === "object" && body !== null && "code" in body
      ? String((body as Record<string, unknown>).code)
      : undefined;

  switch (status) {
    case 400:
      return new ValidationError(message, body);
    case 401:
    case 403:
      return new AuthError(message, status, body);
    case 402: {
      const challenge =
        typeof body === "object" && body !== null && "rails" in body
          ? body
          : undefined;
      return new PaymentRequiredError(message, challenge, body);
    }
    case 404:
      return new NotFoundError(message, body);
    case 422:
      if (code === "SPENDING_CAP_EXCEEDED") {
        return new SpendingCapError(message, body);
      }
      return new ValidationError(message, body);
    case 429: {
      return new RateLimitError(message, undefined, body);
    }
    default:
      if (status >= 500) {
        return new ServerError(message, status, body);
      }
      return new KeeperKitError({
        message,
        status,
        code: code ?? "UNKNOWN_ERROR",
        isRetryable: false,
        body,
      });
  }
}
