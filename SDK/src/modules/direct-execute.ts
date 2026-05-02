/**
 * Direct Execute API module.
 *
 * Covers: transfer, contractCall, checkAndExecute, getStatus, waitForCompletion.
 */

import type { KeeperKitHttpClient } from "../client/http.js";
import type {
  DirectExecution,
  TransferInput,
  ContractCallInput,
  CheckAndExecuteInput,
} from "../models/direct-execution.js";
import { sleep } from "../client/retry.js";
import { KeeperKitError } from "../client/errors.js";

// ---------------------------------------------------------------------------
// Terminal statuses
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set(["completed", "failed"]);

function normalizeNetwork(input: { network?: string; chainId?: number }): string {
  if (input.network) {
    return input.network;
  }

  switch (input.chainId) {
    case 1:
      return "ethereum";
    case 11155111:
      return "sepolia";
    case 8453:
      return "base";
    case 84532:
      return "base-sepolia";
    case 137:
      return "polygon";
    case 42161:
      return "arbitrum";
    case 10:
      return "optimism";
    default:
      throw new Error("network is required and must be a non-empty string");
  }
}

function normalizeTransferInput(input: TransferInput): Record<string, unknown> {
  return {
    network: normalizeNetwork(input),
    recipientAddress: input.recipientAddress ?? input.to,
    amount: input.amount,
    tokenAddress: input.tokenAddress,
    tokenConfig: input.tokenConfig,
    gasLimitMultiplier: input.gasLimitMultiplier,
    integrationId: input.integrationId,
  };
}

function normalizeContractCallInput(input: ContractCallInput): Record<string, unknown> {
  return {
    network: normalizeNetwork(input),
    contractAddress: input.contractAddress,
    functionName: input.functionName,
    functionArgs: input.functionArgs ?? input.args,
    abi: input.abi,
    value: input.value,
    gasLimitMultiplier: input.gasLimitMultiplier,
    integrationId: input.integrationId,
  };
}

function normalizeCheckAndExecuteInput(input: CheckAndExecuteInput): Record<string, unknown> {
  return {
    network: normalizeNetwork(input),
    check: {
      ...input.check,
      functionArgs: input.check.functionArgs ?? input.check.args,
    },
    condition: input.condition,
    execute: {
      ...input.execute,
      functionArgs: input.execute.functionArgs ?? input.execute.args,
    },
    integrationId: input.integrationId,
  };
}

export class DirectExecuteModule {
  constructor(
    private readonly http: KeeperKitHttpClient,
    private readonly apiKey?: string,
  ) {}

  private request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    return this.http.request<T>({
      method,
      path,
      body,
      headers: this.apiKey ? { "X-API-Key": this.apiKey } : undefined,
    });
  }

  /**
   * Execute a native or ERC-20 token transfer.
   */
  async transfer(input: TransferInput): Promise<DirectExecution> {
    return this.request<DirectExecution>("POST", "/api/execute/transfer", normalizeTransferInput(input));
  }

  /**
   * Execute a smart contract function call.
   */
  async contractCall(input: ContractCallInput): Promise<DirectExecution> {
    return this.request<DirectExecution>("POST", "/api/execute/contract-call", normalizeContractCallInput(input));
  }

  /**
   * Read a value on-chain, evaluate a condition, and execute a write if met.
   */
  async checkAndExecute(
    input: CheckAndExecuteInput,
  ): Promise<DirectExecution> {
    return this.request<DirectExecution>("POST", "/api/execute/check-and-execute", normalizeCheckAndExecuteInput(input));
  }

  /**
   * Get the status of a direct execution.
   */
  async getStatus(executionId: string): Promise<DirectExecution> {
    return this.request<DirectExecution>("GET", `/api/execute/${executionId}/status`);
  }

  /**
   * Poll a direct execution until it reaches a terminal state.
   *
   * @param executionId - The execution to poll.
   * @param options.timeout - Maximum wait time in milliseconds (default: 300_000 = 5 min).
   * @param options.pollInterval - Interval between polls in milliseconds (default: 2_000).
   */
  async waitForCompletion(
    executionId: string,
    options?: { timeout?: number; pollInterval?: number },
  ): Promise<DirectExecution> {
    const timeout = options?.timeout ?? 300_000;
    const pollInterval = options?.pollInterval ?? 2_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const execution = await this.getStatus(executionId);

      if (TERMINAL_STATUSES.has(execution.status)) {
        return execution;
      }

      await sleep(pollInterval);
    }

    throw new KeeperKitError({
      message: `Direct execution ${executionId} did not complete within ${timeout}ms`,
      status: 0,
      code: "EXECUTION_TIMEOUT",
      isRetryable: false,
    });
  }
}
