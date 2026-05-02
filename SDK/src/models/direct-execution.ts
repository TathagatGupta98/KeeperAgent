/**
 * Direct execution types for transfer, contract-call, and check-and-execute.
 *
 * Matches the `direct_executions` schema and `app/api/execute/_lib/types.ts`.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type DirectExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type DirectExecutionType =
  | "transfer"
  | "contract-call"
  | "check-and-execute";

export type CheckAndExecuteOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "not_contains";

// ---------------------------------------------------------------------------
// Direct Execution
// ---------------------------------------------------------------------------

export interface DirectExecution {
  id: string;
  /** Alias returned by some direct-execution endpoints. */
  executionId?: string;
  type: DirectExecutionType;
  status: DirectExecutionStatus;
  chainId: number;
  input: unknown;
  output: unknown;
  error: unknown;
  transactionHash: string | null;
  transactionLink?: string | null;
  gasUsedWei?: string | null;
  result?: unknown;
  executed?: boolean;
  condition?: {
    met: boolean;
    observedValue?: string;
    targetValue?: string;
    operator?: CheckAndExecuteOperator;
  };
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Input Types
// ---------------------------------------------------------------------------

export interface TransferInput {
  network?: string;
  chainId?: number;
  recipientAddress?: string;
  to?: string;
  /** Amount as a string to avoid precision loss for big integers. */
  amount: string;
  /** Token contract address. If omitted, transfers native currency. */
  tokenAddress?: string;
  /** Optional token metadata for non-standard tokens. */
  tokenConfig?: string | Record<string, unknown>;
  gasLimitMultiplier?: string | number;
  integrationId?: string;
}

export interface ContractCallInput {
  network?: string;
  chainId?: number;
  contractAddress: string;
  functionName: string;
  abi: unknown[];
  args?: unknown[];
  functionArgs?: string | unknown[];
  /** Value in wei (string for BigInt safety). */
  value?: string;
  gasLimitMultiplier?: string | number;
  integrationId?: string;
}

export interface CheckAndExecuteInput {
  network?: string;
  chainId?: number;
  /** Read call configuration */
  check: {
    contractAddress: string;
    functionName: string;
    abi: unknown[];
    args?: unknown[];
    functionArgs?: string | unknown[];
  };
  /** Condition to evaluate against the read result */
  condition: {
    operator: CheckAndExecuteOperator;
    value: string;
    /** JSON path to extract from the read result (default: result itself). */
    fieldPath?: string;
  };
  /** Write call to execute if condition is met */
  execute: {
    contractAddress: string;
    functionName: string;
    abi: unknown[];
    args?: unknown[];
    functionArgs?: string | unknown[];
    value?: string;
    gasLimitMultiplier?: string | number;
  };
  integrationId?: string;
}
