/**
 * Workflows API module.
 *
 * Covers: list, get, create, update, delete, execute, enable, disable,
 * duplicate, download, goLive.
 */

import type { KeeperKitHttpClient } from "../client/http.js";
import type {
  Workflow,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  GoLiveInput,
} from "../models/workflow.js";

export class WorkflowsModule {
  constructor(private readonly http: KeeperKitHttpClient) {}

  /**
   * List all workflows, optionally filtered by project or tag.
   */
  async list(options?: {
    projectId?: string;
    tagId?: string;
    page?: number;
    limit?: number;
  }): Promise<Workflow[]> {
    return this.http.request<Workflow[]>({
      method: "GET",
      path: "/workflows",
      query: {
        projectId: options?.projectId,
        tagId: options?.tagId,
        page: options?.page,
        limit: options?.limit,
      },
    });
  }

  /**
   * Get a single workflow by ID.
   */
  async get(workflowId: string): Promise<Workflow> {
    return this.http.request<Workflow>({
      method: "GET",
      path: `/workflows/${workflowId}`,
    });
  }

  /**
   * Create a new workflow.
   */
  async create(input: CreateWorkflowInput): Promise<Workflow> {
    return this.http.request<Workflow>({
      method: "POST",
      path: "/workflows/create",
      body: input,
    });
  }

  /**
   * Update an existing workflow.
   */
  async update(
    workflowId: string,
    input: UpdateWorkflowInput,
  ): Promise<Workflow> {
    return this.http.request<Workflow>({
      method: "PATCH",
      path: `/workflows/${workflowId}`,
      body: input,
    });
  }

  /**
   * Delete a workflow.
   * @param force - If true, deletes even if the workflow has active executions.
   */
  async delete(
    workflowId: string,
    options?: { force?: boolean },
  ): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/workflows/${workflowId}`,
      query: { force: options?.force },
    });
  }

  /**
   * Enable a workflow.
   */
  async enable(workflowId: string): Promise<Workflow> {
    return this.http.request<Workflow>({
      method: "PATCH",
      path: `/workflows/${workflowId}`,
      body: { enabled: true },
    });
  }

  /**
   * Disable a workflow.
   */
  async disable(workflowId: string): Promise<Workflow> {
    return this.http.request<Workflow>({
      method: "PATCH",
      path: `/workflows/${workflowId}`,
      body: { enabled: false },
    });
  }

  /**
   * Execute a workflow and return the execution ID.
   */
  async execute(
    workflowId: string,
    input?: Record<string, unknown>,
  ): Promise<{ executionId: string; runId?: string; status?: string }> {
    return this.http.request<{ executionId: string; runId?: string; status?: string }>({
      method: "POST",
      path: `/workflow/${workflowId}/execute`,
      body: input ?? {},
    });
  }

  /**
   * Duplicate a workflow.
   */
  async duplicate(workflowId: string): Promise<Workflow> {
    return this.http.request<Workflow>({
      method: "POST",
      path: `/workflows/${workflowId}/duplicate`,
    });
  }

  /**
   * Download the workflow definition as JSON.
   */
  async download(workflowId: string): Promise<unknown> {
    return this.http.request<unknown>({
      method: "GET",
      path: `/workflows/${workflowId}/download`,
    });
  }

  /**
   * List a workflow on the marketplace (go live).
   */
  async goLive(workflowId: string, options: GoLiveInput): Promise<Workflow> {
    return this.http.request<Workflow>({
      method: "POST",
      path: `/workflows/${workflowId}/go-live`,
      body: options,
    });
  }
}
