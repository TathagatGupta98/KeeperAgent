/**
 * Executions API module.
 *
 * Covers: list by workflow, get single execution, get status, get logs,
 * cancel, delete history, and waitForCompletion polling helper.
 */

import type { KeeperKitHttpClient } from "../client/http.js";
import type {
  WorkflowExecution,
  ExecutionProgress,
  ExecutionLog,
} from "../models/execution.js";
import { sleep } from "../client/retry.js";
import { KeeperKitError } from "../client/errors.js";

// ---------------------------------------------------------------------------
// Terminal statuses
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = new Set(["success", "error", "cancelled"]);

export class ExecutionsModule {
  constructor(private readonly http: KeeperKitHttpClient) {}

  /**
   * List all executions for a workflow.
   */
  async listByWorkflow(
    workflowId: string,
    options?: { page?: number; limit?: number },
  ): Promise<WorkflowExecution[]> {
    return this.http.request<WorkflowExecution[]>({
      method: "GET",
      path: `/workflows/${workflowId}/executions`,
      query: {
        page: options?.page,
        limit: options?.limit,
      },
    });
  }

  /**
   * Get a single execution by ID.
   */
  async get(executionId: string): Promise<WorkflowExecution> {
    return this.http.request<WorkflowExecution>({
      method: "GET",
      path: `/workflows/executions/${executionId}`,
    });
  }

  /**
   * Get the current status/progress of an execution.
   */
  async getStatus(executionId: string): Promise<ExecutionProgress> {
    return this.http.request<ExecutionProgress>({
      method: "GET",
      path: `/workflows/executions/${executionId}/status`,
    });
  }

  /**
   * Get per-node execution logs.
   */
  async getLogs(executionId: string): Promise<ExecutionLog[]> {
    return this.http.request<ExecutionLog[]>({
      method: "GET",
      path: `/workflows/executions/${executionId}/logs`,
    });
  }

  /**
   * Cancel a running execution.
   */
  async cancel(executionId: string): Promise<void> {
    await this.http.request<void>({
      method: "POST",
      path: `/executions/${executionId}/cancel`,
    });
  }

  /**
   * Delete all execution history for a workflow.
   */
  async deleteHistory(workflowId: string): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/workflows/${workflowId}/executions`,
    });
  }

  /**
   * Poll an execution until it reaches a terminal state.
   *
   * @param executionId - The execution to poll.
   * @param options.timeout - Maximum wait time in milliseconds (default: 300_000 = 5 min).
   * @param options.pollInterval - Interval between polls in milliseconds (default: 2_000).
   */
  async waitForCompletion(
    executionId: string,
    options?: { timeout?: number; pollInterval?: number },
  ): Promise<WorkflowExecution> {
    const timeout = options?.timeout ?? 300_000;
    const pollInterval = options?.pollInterval ?? 2_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      const progress = await this.getStatus(executionId);

      if (TERMINAL_STATUSES.has(progress.status)) {
        // Fetch the full execution for complete data
        return this.get(executionId);
      }

      await sleep(pollInterval);
    }

    throw new KeeperKitError({
      message: `Execution ${executionId} did not complete within ${timeout}ms`,
      status: 0,
      code: "EXECUTION_TIMEOUT",
      isRetryable: false,
    });
  }
}
