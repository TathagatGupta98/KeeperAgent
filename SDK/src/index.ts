/**
 * KeeperKit SDK -- Entry Point
 *
 * @example
 * ```ts
 * import { KeeperKit } from "keeperkit";
 *
 * const client = new KeeperKit({
 *   apiKey: "kh_live_abc123...",
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

// ---------------------------------------------------------------------------
// Config (legacy factory interface, kept for backward compat)
// ---------------------------------------------------------------------------

export interface KeeperHubConfig {
  /** Organization API key (starts with `kh_`). Shorthand for `auth: new ApiKeyAuth(apiKey)`. */
  apiKey?: string;
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
// Legacy Client Interface
// ---------------------------------------------------------------------------

export interface KeeperHubClient {
  workflows: WorkflowsModule;
  executions: ExecutionsModule;
  directExecute: DirectExecuteModule;
  listedWorkflows: ListedWorkflowsModule;
  integrations: IntegrationsModule;
  projects: ProjectsModule;
  tags: TagsModule;
  chains: ChainsModule;
  mcpSchemas: McpSchemasModule;
}

/**
 * Create a fully configured KeeperHub client (namespaced API).
 *
 * For the flat API, use `new KeeperKit({ apiKey })` instead.
 */
export function createKeeperHubClient(config: KeeperHubConfig = {}): KeeperHubClient {
  const auth = config.auth ?? (config.apiKey ? new ApiKeyAuth(config.apiKey) : undefined);

  const httpConfig: HttpClientConfig = {
    baseUrl: config.baseUrl,
    auth,
    retry: config.retry,
    timeout: config.timeout,
  };

  const http = new KeeperKitHttpClient(httpConfig);

  return {
    workflows: new WorkflowsModule(http),
    executions: new ExecutionsModule(http),
    directExecute: new DirectExecuteModule(http),
    listedWorkflows: new ListedWorkflowsModule(http),
    integrations: new IntegrationsModule(http),
    projects: new ProjectsModule(http),
    tags: new TagsModule(http),
    chains: new ChainsModule(http),
    mcpSchemas: new McpSchemasModule(http),
  };
}

// ---------------------------------------------------------------------------
// Primary export: KeeperKit class
// ---------------------------------------------------------------------------

export { KeeperKit } from "./keeperkit.js";
export type { KeeperKitConfig } from "./keeperkit.js";

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

// Client
export { KeeperKitHttpClient, KeeperHubHttpClient } from "./client/http.js";
export type { HttpClientConfig, HttpMethod, RequestOptions } from "./client/http.js";
export { ApiKeyAuth, OAuthBearerAuth, SessionAuth } from "./client/auth.js";
export type { AuthProvider } from "./client/auth.js";
export {
  KeeperKitError,
  KeeperHubError,
  AuthError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  SpendingCapError,
  PaymentRequiredError,
  ExecutionError,
  ServerError,
  mapResponseToError,
} from "./client/errors.js";
export type { RetryPolicy } from "./client/retry.js";
export { DEFAULT_RETRY_POLICY } from "./client/retry.js";

// Models
export type {
  Workflow,
  WorkflowNode,
  WorkflowNodePosition,
  WorkflowNodeData,
  WorkflowEdge,
  WorkflowVisibility,
  WorkflowType,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  ListedWorkflowView,
  GoLiveInput,
  WorkflowDefinition,
  TriggerConfig,
  ActionConfig,
  ConditionConfig,
} from "./models/workflow.js";
export type {
  WorkflowExecution,
  WorkflowExecutionStatus,
  ExecutionProgress,
  ExecutionLog,
  Execution,
  NodeResult,
} from "./models/execution.js";
export type {
  DirectExecution,
  DirectExecutionStatus,
  DirectExecutionType,
  CheckAndExecuteOperator,
  TransferInput,
  ContractCallInput,
  CheckAndExecuteInput,
} from "./models/direct-execution.js";
export type {
  Integration,
  IntegrationType,
  CreateIntegrationInput,
  UpdateIntegrationInput,
} from "./models/integration.js";
export type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  Tag,
  CreateTagInput,
  UpdateTagInput,
  Chain,
  McpSchemaAction,
  McpSchemaTrigger,
  McpSchemaField,
  McpSchemaResponse,
  PaginatedResponse,
  ApiErrorResponse,
} from "./models/common.js";
export type {
  PaymentRail,
  PaymentChallenge,
  PaymentRailChallenge,
  PaymentHeaders,
  ListedWorkflowCallResult,
} from "./models/payment.js";
export type { UnifiedStatus } from "./models/status.js";
export {
  normalizeWorkflowStatus,
  normalizeDirectStatus,
  normalizeStatus,
} from "./models/status.js";

// Helpers
export {
  createTriggerNode,
  createActionNode,
  createConditionNode,
  createEdge,
  createConditionEdges,
  templateRef,
} from "./helpers/workflow-builders.js";
export {
  validateWorkflowGraph,
  validateNodeConfig,
} from "./helpers/node-validators.js";
export type { ValidationResult, ValidationError as WorkflowValidationError } from "./helpers/node-validators.js";
export {
  parseTemplateRef,
  extractTemplateRefs,
  buildTemplateRef,
  interpolateTemplates,
  hasTemplateRefs,
} from "./helpers/template-utils.js";
export type { ParsedTemplateRef } from "./helpers/template-utils.js";

// Modules (for advanced composition)
export { WorkflowsModule } from "./modules/workflows.js";
export { ExecutionsModule } from "./modules/executions.js";
export { DirectExecuteModule } from "./modules/direct-execute.js";
export { ListedWorkflowsModule } from "./modules/listed-workflows.js";
export { IntegrationsModule } from "./modules/integrations.js";
export { ProjectsModule } from "./modules/projects.js";
export { TagsModule } from "./modules/tags.js";
export { ChainsModule } from "./modules/chains.js";
export { McpSchemasModule } from "./modules/mcp-schemas.js";
