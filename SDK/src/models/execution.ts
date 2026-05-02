/**
 * Workflow execution types.
 *
 * Matches the `workflow_executions` and `workflow_execution_logs` tables.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type WorkflowExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "cancelled";

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  input: unknown;
  output: unknown;
  error: unknown;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;

  // Progress tracking
  totalSteps: number | null;
  completedSteps: number | null;
  currentNodeId: string | null;
  currentNodeName: string | null;
  lastSuccessfulNodeId: string | null;
  lastSuccessfulNodeName: string | null;
  executionTrace: string[];
  runId: string | null;

  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Progress (lightweight status check)
// ---------------------------------------------------------------------------

export interface ExecutionProgress {
  id: string;
  status: WorkflowExecutionStatus;
  totalSteps: number | null;
  completedSteps: number | null;
  currentNodeId: string | null;
  currentNodeName: string | null;
}

// ---------------------------------------------------------------------------
// Execution Logs (per-node)
// ---------------------------------------------------------------------------

export interface ExecutionLog {
  id: string;
  executionId: string;
  nodeId: string;
  nodeName: string | null;
  nodeType: string | null;
  status: string;
  input: unknown;
  output: unknown;
  error: unknown;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;

  // Loop fields
  iterationIndex: number | null;
  forEachNodeId: string | null;
}

// ---------------------------------------------------------------------------
// Brief-required type aliases
// ---------------------------------------------------------------------------

/** Alias for WorkflowExecution -- an execution record with status and node results. */
export type Execution = WorkflowExecution;

/** Alias for ExecutionLog -- per-node output from an execution. */
export type NodeResult = ExecutionLog;
