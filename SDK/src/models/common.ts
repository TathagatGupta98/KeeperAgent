/**
 * Common types shared across the KeeperHub SDK.
 */

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// API Error
// ---------------------------------------------------------------------------

export interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  userId: string;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
}

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------

export interface Tag {
  id: string;
  name: string;
  color: string;
  userId: string;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  color: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

// ---------------------------------------------------------------------------
// Chain
// ---------------------------------------------------------------------------

export interface Chain {
  id: number;
  name: string;
  chainId: number;
  rpcUrl?: string;
  explorerUrl?: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  enabled: boolean;
  testnet: boolean;
}

// ---------------------------------------------------------------------------
// MCP Schemas
// ---------------------------------------------------------------------------

export interface McpSchemaAction {
  type: string;
  name: string;
  description: string;
  pluginId: string;
  category: string;
  configFields: McpSchemaField[];
  outputFields: McpSchemaField[];
  requiresCredential: boolean;
  supportedChains?: number[];
}

export interface McpSchemaTrigger {
  type: string;
  name: string;
  description: string;
  configFields: McpSchemaField[];
}

export interface McpSchemaField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  description?: string;
  options?: { label: string; value: string }[];
}

export interface McpSchemaResponse {
  actions: McpSchemaAction[];
  triggers: McpSchemaTrigger[];
  chains: Chain[];
}
