/**
 * Workflow builder helpers.
 *
 * Utility functions for programmatically constructing workflow graphs
 * with correct node/edge structures.
 */

import type { WorkflowNode, WorkflowEdge } from "../models/workflow.js";

let _nodeIdCounter = 0;

function generateNodeId(): string {
  return `node_${Date.now()}_${++_nodeIdCounter}`;
}

function generateEdgeId(source: string, target: string): string {
  return `edge_${source}_${target}`;
}

// ---------------------------------------------------------------------------
// Node Builders
// ---------------------------------------------------------------------------

/**
 * Create a trigger node (schedule, webhook, event, block, or manual).
 */
export function createTriggerNode(opts: {
  id?: string;
  label: string;
  triggerType: "schedule" | "webhook" | "event" | "block" | "manual";
  config?: Record<string, unknown>;
  position?: { x: number; y: number };
}): WorkflowNode {
  return {
    id: opts.id ?? generateNodeId(),
    type: "trigger",
    position: opts.position ?? { x: 250, y: 0 },
    data: {
      type: opts.triggerType,
      label: opts.label,
      ...opts.config,
    },
  };
}

/**
 * Create an action node (web3, notification, plugin action, etc.).
 */
export function createActionNode(opts: {
  id?: string;
  label: string;
  actionType: string;
  pluginId?: string;
  config?: Record<string, unknown>;
  position?: { x: number; y: number };
}): WorkflowNode {
  return {
    id: opts.id ?? generateNodeId(),
    type: "action",
    position: opts.position ?? { x: 250, y: 200 },
    data: {
      type: opts.actionType,
      label: opts.label,
      pluginId: opts.pluginId,
      ...opts.config,
    },
  };
}

/**
 * Create a condition node with true/false output handles.
 */
export function createConditionNode(opts: {
  id?: string;
  label: string;
  rules?: unknown;
  expression?: string;
  position?: { x: number; y: number };
}): WorkflowNode {
  return {
    id: opts.id ?? generateNodeId(),
    type: "condition",
    position: opts.position ?? { x: 250, y: 200 },
    data: {
      type: "condition",
      label: opts.label,
      rules: opts.rules,
      expression: opts.expression,
    },
  };
}

// ---------------------------------------------------------------------------
// Edge Builders
// ---------------------------------------------------------------------------

/**
 * Create an edge between two nodes.
 * For condition nodes, use `sourceHandle: "true"` or `sourceHandle: "false"`
 * to specify which branch to follow.
 */
export function createEdge(opts: {
  source: string;
  target: string;
  sourceHandle?: "true" | "false" | string | null;
  targetHandle?: string | null;
}): WorkflowEdge {
  return {
    id: generateEdgeId(opts.source, opts.target),
    source: opts.source,
    target: opts.target,
    sourceHandle: opts.sourceHandle ?? null,
    targetHandle: opts.targetHandle ?? null,
  };
}

/**
 * Create condition branch edges (true and false paths).
 */
export function createConditionEdges(
  conditionNodeId: string,
  trueTarget: string,
  falseTarget: string,
): [WorkflowEdge, WorkflowEdge] {
  return [
    createEdge({
      source: conditionNodeId,
      target: trueTarget,
      sourceHandle: "true",
    }),
    createEdge({
      source: conditionNodeId,
      target: falseTarget,
      sourceHandle: "false",
    }),
  ];
}

// ---------------------------------------------------------------------------
// Template Reference Builder
// ---------------------------------------------------------------------------

/**
 * Build a template reference string for referring to another node's output.
 *
 * Format: `{{@nodeId:Label.field}}`
 *
 * @example
 * templateRef("node_1", "Check Balance", "result.balance")
 * // → "{{@node_1:Check Balance.result.balance}}"
 */
export function templateRef(
  nodeId: string,
  label: string,
  field: string,
): string {
  return `{{@${nodeId}:${label}.${field}}}`;
}
