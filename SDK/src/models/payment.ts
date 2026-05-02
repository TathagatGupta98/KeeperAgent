/**
 * Payment types for listed workflow calls.
 *
 * Supports dual payment rails: x402 (Base USDC) and MPP (Tempo USDC.e).
 */

// ---------------------------------------------------------------------------
// Payment Rails
// ---------------------------------------------------------------------------

export type PaymentRail = "x402" | "mpp";

// ---------------------------------------------------------------------------
// Payment Challenge (from 402 responses)
// ---------------------------------------------------------------------------

export interface PaymentChallenge {
  /** Which payment rail(s) are accepted. */
  rails: PaymentRailChallenge[];
  /** Workflow slug that requires payment. */
  slug: string;
  /** Price in USDC (human-readable, e.g. "0.01"). */
  priceUsdcPerCall: string;
}

export interface PaymentRailChallenge {
  rail: PaymentRail;
  chainId: number;
  tokenAddress: string;
  /** Recipient address for the payment. */
  recipientAddress: string;
  /** Raw amount in token smallest unit (string for BigInt safety). */
  amount: string;
}

// ---------------------------------------------------------------------------
// Payment Headers (caller provides these after paying)
// ---------------------------------------------------------------------------

export interface PaymentHeaders {
  /** For x402: the payment proof header value. */
  "X-PAYMENT"?: string;
  /** For MPP: the payment header value. */
  "X-MPP-PAYMENT"?: string;
  /** Any additional payment-related headers. */
  [key: string]: string | undefined;
}

// ---------------------------------------------------------------------------
// Listed Workflow Call Result
// ---------------------------------------------------------------------------

export interface ListedWorkflowCallResult<T = unknown> {
  /** The result data from the workflow execution. */
  data: T;
  /** Payment metadata if the call involved payment. */
  payment?: {
    rail: PaymentRail;
    transactionHash?: string;
    receipt?: Record<string, string>;
  };
  /** Raw response headers (for receipt preservation). */
  responseHeaders: Record<string, string>;
}
