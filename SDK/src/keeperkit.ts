/**
 * KeeperKit -- Flat-API client class for the KeeperHub protocol.
 *
 * Provides the simplified, flat method signatures required by the KeeperKit SDK brief
 * while internally delegating to the namespaced modules.
 *
 * @example
 * ```ts
 * import { KeeperKit } from "keeperkit";
 *
 * const client = new KeeperKit({
 *   apiKey: process.env.KEEPERHUB_API_KEY,
 * });
 *
 * const workflows = await client.listWorkflows();
 * const { executionId } = await client.executeWorkflow(workflows[0].id);
 * const result = await client.waitForExecution(workflows[0].id, executionId);
 * ```
 */

import { KeeperKitHttpClient, type HttpClientConfig } from "./client/http.js";
import { ApiKeyAuth, type AuthProvider } from "./client/auth.js";
import type { RetryPolicy } from "./client/retry.js";

import { WorkflowsModule } from "./modules/workflows.js";
import { ExecutionsModule } from "./modules/executions.js";
import { DirectExecuteModule } from "./modules/direct-execute.js";
import { ListedWorkflowsModule } from "./modules/listed-workflows.js";
import { IntegrationsModule } from "./modules/integrations.js";
import { ProjectsModule } from "./modules/projects.js";
import { TagsModule } from "./modules/tags.js";
import { ChainsModule } from "./modules/chains.js";
import { McpSchemasModule } from "./modules/mcp-schemas.js";

import type {
  Workflow,
  CreateWorkflowInput,
  UpdateWorkflowInput,
} from "./models/workflow.js";
import type { WorkflowExecution } from "./models/execution.js";
import type {
  Integration,
  CreateIntegrationInput,
} from "./models/integration.js";
import type { Chain } from "./models/common.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface KeeperKitConfig {
  /** Organization API key (starts with `kh_`). */
  apiKey?: string;
  /** API key for direct execution endpoints, sent as `X-API-Key`. */
  directExecutionApiKey?: string;
  /** Base URL for the KeeperHub API (default: `https://app.keeperhub.com/api`). */
  baseUrl?: string;
  /** Custom auth provider (overrides `apiKey` if both are set). */
  auth?: AuthProvider;
  /** Retry policy overrides. */
  retry?: Partial<RetryPolicy>;
  /** Request timeout in milliseconds (default: 30000). */
  timeout?: number;
}

// ---------------------------------------------------------------------------
// KeeperKit Class
// ---------------------------------------------------------------------------

export class KeeperKit {
  /** Access the full namespaced workflows API. */
  readonly workflows: WorkflowsModule;
  /** Access the full namespaced executions API. */
  readonly executions: ExecutionsModule;
  /** Access the full namespaced direct-execute API. */
  readonly directExecute: DirectExecuteModule;
  /** Access the full namespaced listed-workflows API. */
  readonly listedWorkflows: ListedWorkflowsModule;
  /** Access the full namespaced integrations API. */
  readonly integrations: IntegrationsModule;
  /** Access the full namespaced projects API. */
  readonly projects: ProjectsModule;
  /** Access the full namespaced tags API. */
  readonly tags: TagsModule;
  /** Access the full namespaced chains API. */
  readonly chains: ChainsModule;
  /** Access the full namespaced MCP schemas API. */
  readonly mcpSchemas: McpSchemasModule;

  constructor(config: KeeperKitConfig = {}) {
    const auth = config.auth ?? (config.apiKey ? new ApiKeyAuth(config.apiKey) : undefined);

    const httpConfig: HttpClientConfig = {
      baseUrl: config.baseUrl,
      auth,
      retry: config.retry,
      timeout: config.timeout,
    };

    const http = new KeeperKitHttpClient(httpConfig);

    this.workflows = new WorkflowsModule(http);
    this.executions = new ExecutionsModule(http);
    this.directExecute = new DirectExecuteModule(http, config.directExecutionApiKey ?? config.apiKey);
    this.listedWorkflows = new ListedWorkflowsModule(http);
    this.integrations = new IntegrationsModule(http);
    this.projects = new ProjectsModule(http);
    this.tags = new TagsModule(http);
    this.chains = new ChainsModule(http);
    this.mcpSchemas = new McpSchemasModule(http);
  }

  // -----------------------------------------------------------------------
  // Flat Workflow Methods
  // -----------------------------------------------------------------------

  /**
   * List all workflows with optional pagination.
   */
  async listWorkflows(params?: { page?: number; limit?: number }): Promise<Workflow[]> {
    return this.workflows.list(params);
  }

  /**
   * Get a single workflow by ID.
   */
  async getWorkflow(id: string): Promise<Workflow> {
    return this.workflows.get(id);
  }

  /**
   * Create a new workflow from a definition.
   */
  async createWorkflow(definition: CreateWorkflowInput): Promise<Workflow> {
    return this.workflows.create(definition);
  }

  /**
   * Update an existing workflow.
   */
  async updateWorkflow(id: string, updates: Partial<UpdateWorkflowInput>): Promise<Workflow> {
    return this.workflows.update(id, updates);
  }

  /**
   * Delete a workflow.
   */
  async deleteWorkflow(id: string): Promise<void> {
    return this.workflows.delete(id);
  }

  /**
   * Enable a workflow.
   */
  async enableWorkflow(id: string): Promise<Workflow> {
    return this.workflows.enable(id);
  }

  /**
   * Disable a workflow.
   */
  async disableWorkflow(id: string): Promise<Workflow> {
    return this.workflows.disable(id);
  }

  // -----------------------------------------------------------------------
  // Flat Execution Methods
  // -----------------------------------------------------------------------

  /**
   * Trigger a manual workflow execution.
   */
  async executeWorkflow(id: string): Promise<{ executionId: string; runId?: string; status?: string }> {
    return this.workflows.execute(id);
  }

  /**
   * Get a single execution by workflow ID and execution ID.
   */
  async getExecution(workflowId: string, executionId: string): Promise<WorkflowExecution> {
    // The execution ID is sufficient to fetch, but we accept workflowId for API consistency
    void workflowId;
    return this.executions.get(executionId);
  }

  /**
   * List executions for a workflow with optional pagination.
   */
  async listExecutions(
    workflowId: string,
    params?: { page?: number; limit?: number },
  ): Promise<WorkflowExecution[]> {
    return this.executions.listByWorkflow(workflowId, params);
  }

  /**
   * Poll an execution until it reaches a terminal state.
   */
  async waitForExecution(
    workflowId: string,
    executionId: string,
    opts?: { timeoutMs?: number; pollIntervalMs?: number },
  ): Promise<WorkflowExecution> {
    // The execution ID is sufficient to poll, but we accept workflowId for API consistency
    void workflowId;
    return this.executions.waitForCompletion(executionId, {
      timeout: opts?.timeoutMs,
      pollInterval: opts?.pollIntervalMs,
    });
  }

  // -----------------------------------------------------------------------
  // Flat Chain Methods
  // -----------------------------------------------------------------------

  /**
   * List all supported chains.
   */
  async listChains(): Promise<Chain[]> {
    return this.chains.list();
  }

  // -----------------------------------------------------------------------
  // Flat Integration Methods
  // -----------------------------------------------------------------------

  /**
   * List all configured integrations/connections.
   */
  async listIntegrations(): Promise<Integration[]> {
    return this.integrations.list();
  }

  /**
   * Create a new integration/connection.
   */
  async createIntegration(data: CreateIntegrationInput): Promise<Integration> {
    return this.integrations.create(data);
  }

  /**
   * Delete an integration/connection.
   */
  async deleteIntegration(id: string): Promise<void> {
    return this.integrations.delete(id);
  }
}
