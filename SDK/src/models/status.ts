/**
 * Status normalization utilities.
 *
 * KeeperHub uses different status vocabularies for workflow executions
 * and direct executions. This module provides an optional unified mapping
 * without hiding raw server values.
 */

import type { WorkflowExecutionStatus } from "./execution.js";
import type { DirectExecutionStatus } from "./direct-execution.js";

// ---------------------------------------------------------------------------
// Unified Status
// ---------------------------------------------------------------------------

export type UnifiedStatus =
  | "queued"
  | "in_progress"
  | "succeeded"
  | "failed"
  | "cancelled";

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const WORKFLOW_STATUS_MAP: Record<WorkflowExecutionStatus, UnifiedStatus> = {
  pending: "queued",
  running: "in_progress",
  success: "succeeded",
  error: "failed",
  cancelled: "cancelled",
};

const DIRECT_STATUS_MAP: Record<DirectExecutionStatus, UnifiedStatus> = {
  pending: "queued",
  running: "in_progress",
  completed: "succeeded",
  failed: "failed",
};

/**
 * Normalize a workflow execution status to the unified vocabulary.
 */
export function normalizeWorkflowStatus(
  status: WorkflowExecutionStatus,
): UnifiedStatus {
  return WORKFLOW_STATUS_MAP[status] ?? "failed";
}

/**
 * Normalize a direct execution status to the unified vocabulary.
 */
export function normalizeDirectStatus(
  status: DirectExecutionStatus,
): UnifiedStatus {
  return DIRECT_STATUS_MAP[status] ?? "failed";
}

/**
 * Generic normalizer that auto-detects the status vocabulary.
 */
export function normalizeStatus(
  status: WorkflowExecutionStatus | DirectExecutionStatus,
): UnifiedStatus {
  if (status in WORKFLOW_STATUS_MAP) {
    return WORKFLOW_STATUS_MAP[status as WorkflowExecutionStatus];
  }
  if (status in DIRECT_STATUS_MAP) {
    return DIRECT_STATUS_MAP[status as DirectExecutionStatus];
  }
  return "failed";
}
