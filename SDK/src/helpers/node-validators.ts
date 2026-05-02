/**
 * Node validators — validate workflow node configurations before API submission.
 */

import type { WorkflowNode, WorkflowEdge } from "../models/workflow.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  field?: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Validate a set of nodes and edges for common issues before submission.
 */
export function validateWorkflowGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): ValidationResult {
  const errors: ValidationError[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  // ------ Node validations ------

  // Must have at least one trigger
  const triggers = nodes.filter((n) => n.type === "trigger");
  if (triggers.length === 0) {
    errors.push({ message: "Workflow must have at least one trigger node." });
  }

  // Check each node
  for (const node of nodes) {
    if (!node.id) {
      errors.push({ nodeId: node.id, message: "Node is missing an id." });
    }
    if (!node.type) {
      errors.push({
        nodeId: node.id,
        message: "Node is missing a type.",
      });
    }
    if (!node.data?.label) {
      errors.push({
        nodeId: node.id,
        field: "data.label",
        message: `Node "${node.id}" is missing a label.`,
      });
    }
  }

  // ------ Edge validations ------

  for (const edge of edges) {
    // Source and target must exist
    if (!nodeIds.has(edge.source)) {
      errors.push({
        edgeId: edge.id,
        message: `Edge "${edge.id}" references non-existent source node "${edge.source}".`,
      });
    }
    if (!nodeIds.has(edge.target)) {
      errors.push({
        edgeId: edge.id,
        message: `Edge "${edge.id}" references non-existent target node "${edge.target}".`,
      });
    }

    // Self-loops
    if (edge.source === edge.target) {
      errors.push({
        edgeId: edge.id,
        message: `Edge "${edge.id}" is a self-loop.`,
      });
    }
  }

  // ------ Condition edge validation ------

  const conditionNodes = nodes.filter((n) => n.type === "condition");
  for (const cond of conditionNodes) {
    const condEdges = edges.filter((e) => e.source === cond.id);
    const handles = new Set(condEdges.map((e) => e.sourceHandle));

    if (!handles.has("true") && !handles.has("false")) {
      errors.push({
        nodeId: cond.id,
        message: `Condition node "${cond.id}" has no branch edges (needs "true" and/or "false" sourceHandle).`,
      });
    }
  }

  // ------ Orphan detection ------

  // Non-trigger nodes that have no incoming edges
  const nodesWithIncoming = new Set(edges.map((e) => e.target));
  for (const node of nodes) {
    if (node.type === "trigger") continue;
    if (!nodesWithIncoming.has(node.id)) {
      errors.push({
        nodeId: node.id,
        message: `Node "${node.id}" is an orphan — no incoming edges.`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that required fields are present on a node based on its type.
 */
export function validateNodeConfig(
  node: WorkflowNode,
  requiredFields: string[],
): ValidationResult {
  const errors: ValidationError[] = [];

  for (const field of requiredFields) {
    const value = getNestedValue(node.data, field);
    if (value === undefined || value === null || value === "") {
      errors.push({
        nodeId: node.id,
        field: `data.${field}`,
        message: `Required field "${field}" is missing or empty on node "${node.id}".`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function getNestedValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
