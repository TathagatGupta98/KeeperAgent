/**
 * Workflow domain types.
 *
 * Matches the `workflows` table in `lib/db/schema.ts`.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type WorkflowVisibility = "private" | "public";
export type WorkflowType = "read" | "write";

// ---------------------------------------------------------------------------
// Node / Edge (React Flow-compatible)
// ---------------------------------------------------------------------------

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNodeData {
  type?: string;
  label?: string;
  [key: string]: unknown;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: WorkflowNodePosition;
  data: WorkflowNodeData;
  /** Additional React Flow fields are preserved. */
  [key: string]: unknown;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  /** Additional React Flow fields are preserved. */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Workflow
// ---------------------------------------------------------------------------

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  organizationId: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  visibility: WorkflowVisibility;
  enabled: boolean;
  projectId: string | null;
  tagId: string | null;

  // Listing metadata
  isListed: boolean;
  listedSlug: string | null;
  listedAt: string | null;
  inputSchema: Record<string, unknown> | null;
  outputMapping: Record<string, unknown> | null;
  priceUsdcPerCall: string | null;
  workflowType: WorkflowType;
  category: string | null;
  chain: string | null;

  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  visibility?: WorkflowVisibility;
  enabled?: boolean;
  projectId?: string;
  tagId?: string;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  visibility?: WorkflowVisibility;
  enabled?: boolean;
  projectId?: string | null;
  tagId?: string | null;
}

// ---------------------------------------------------------------------------
// Listed Workflow View (marketplace)
// ---------------------------------------------------------------------------

export interface ListedWorkflowView {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  workflowType: WorkflowType;
  category: string | null;
  chain: string | null;
  priceUsdcPerCall: string | null;
  inputSchema: Record<string, unknown> | null;
  organizationId: string | null;
}

// ---------------------------------------------------------------------------
// Go-live input
// ---------------------------------------------------------------------------

export interface GoLiveInput {
  name: string;
  description?: string;
  tags?: string[];
  workflowType?: WorkflowType;
  category?: string;
  chain?: string;
  priceUsdcPerCall?: string;
  inputSchema?: Record<string, unknown>;
  outputMapping?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Brief-required type aliases
// ---------------------------------------------------------------------------

/** Alias for CreateWorkflowInput -- the workflow definition shape passed to createWorkflow. */
export type WorkflowDefinition = CreateWorkflowInput;

/** Trigger configuration -- the data payload of a trigger node. */
export type TriggerConfig = WorkflowNodeData & { type: string };

/** Action configuration -- the data payload of an action node. */
export type ActionConfig = WorkflowNodeData & { type: string };

/** Condition configuration -- the data payload of a condition node. */
export type ConditionConfig = WorkflowNodeData & { type: "condition" };
