/**
 * Shared types and constants for the KeeperKit ElizaOS plugin.
 */

// ---------------------------------------------------------------------------
// Environment variable keys
// ---------------------------------------------------------------------------

export const ENV_KEYS = {
  API_KEY: 'KEEPERHUB_API_KEY',
  DIRECT_EXECUTION_API_KEY: 'KEEPERHUB_DIRECT_EXECUTION_API_KEY',
  BASE_URL: 'KEEPERHUB_BASE_URL',
  TIMEOUT: 'KEEPERHUB_TIMEOUT',
} as const;

// ---------------------------------------------------------------------------
// Service type constant
// ---------------------------------------------------------------------------

export const KEEPERKIT_SERVICE_TYPE = 'keeperkit' as const;

// ---------------------------------------------------------------------------
// Action result helpers
// ---------------------------------------------------------------------------

export interface KeeperKitActionResult {
  success: boolean;
  text: string;
  data?: Record<string, unknown>;
  values?: Record<string, string>;
  error?: Error;
}

export function successResult(text: string, data?: Record<string, unknown>, values?: Record<string, string>): KeeperKitActionResult {
  return { success: true, text, data, values };
}

export function errorResult(text: string, error?: unknown): KeeperKitActionResult {
  const err = error instanceof Error ? error : new Error(String(error));
  return { success: false, text, error: err };
}
