/**
 * Integration types for credential/connection management.
 */

// ---------------------------------------------------------------------------
// Integration type union (from lib/types/integration.ts)
// ---------------------------------------------------------------------------

export type IntegrationType =
  | "web3"
  | "safe"
  | "aave-v3"
  | "morpho"
  | "uniswap"
  | "aerodrome"
  | "ajna"
  | "chainlink"
  | "compound-v3"
  | "cow-swap"
  | "curve"
  | "lido"
  | "pendle"
  | "rocket-pool"
  | "sky"
  | "spark"
  | "yearn-v3"
  | "discord"
  | "telegram"
  | "slack"
  | "sendgrid"
  | "webhook"
  | (string & {}); // forward-compatible with new types

// ---------------------------------------------------------------------------
// Integration
// ---------------------------------------------------------------------------

export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  userId: string;
  organizationId: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface CreateIntegrationInput {
  name: string;
  type: IntegrationType;
  config: Record<string, unknown>;
}

export interface UpdateIntegrationInput {
  name?: string;
  config?: Record<string, unknown>;
}
