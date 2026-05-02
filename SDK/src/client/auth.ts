/**
 * Pluggable authentication providers for the KeeperHub SDK.
 *
 * Three modes are supported:
 *   1. API Key auth — `Authorization: Bearer kh_...`
 *   2. OAuth Bearer auth — `Authorization: Bearer <token>`
 *   3. Session/cookie auth — passes cookie header (browser/test)
 */

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface AuthProvider {
  /** Returns headers to inject into every outgoing request. */
  getHeaders(): Record<string, string>;
}

// ---------------------------------------------------------------------------
// Implementations
// ---------------------------------------------------------------------------

/**
 * Organization-scoped API key authentication (`kh_` prefix).
 */
export class ApiKeyAuth implements AuthProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || !apiKey.startsWith("kh_")) {
      throw new Error(
        'Invalid KeeperKit API key. Keys must start with "kh_".',
      );
    }
    this.apiKey = apiKey;
  }

  getHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}` };
  }
}

/**
 * OAuth 2.1 Bearer token authentication.
 */
export class OAuthBearerAuth implements AuthProvider {
  private readonly token: string;

  constructor(token: string) {
    if (!token) {
      throw new Error("OAuth bearer token must not be empty.");
    }
    this.token = token;
  }

  getHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` };
  }
}

/**
 * Session/cookie-based authentication for browser or test environments.
 */
export class SessionAuth implements AuthProvider {
  private readonly cookie: string;

  constructor(cookie: string) {
    if (!cookie) {
      throw new Error("Session cookie must not be empty.");
    }
    this.cookie = cookie;
  }

  getHeaders(): Record<string, string> {
    return { Cookie: this.cookie };
  }
}
