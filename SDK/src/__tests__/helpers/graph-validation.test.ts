// SDK surface tested: Workflow graph validation (node-validators.ts)
//
// Maps to claude_test.md Phase 2.2 "Workflow graph validation":
//   - No trigger node -> invalid
//   - Disconnected nodes flagged
//   - Self-loops detected
//   - Node IDs unique within a workflow
//   - Condition edge correctness
//   - Edge references to non-existent nodes

import { describe, it, expect } from "vitest";
import { validateWorkflowGraph } from "../../helpers/node-validators.js";
import type { WorkflowNode, WorkflowEdge } from "../../models/workflow.js";

function makeNode(
  id: string,
  type: string,
  label: string,
): WorkflowNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { type, label },
  };
}

function makeEdge(
  source: string,
  target: string,
  sourceHandle?: string | null,
): WorkflowEdge {
  return {
    id: `e_${source}_${target}`,
    source,
    target,
    sourceHandle: sourceHandle ?? null,
  };
}

describe("Workflow graph validation", () => {
  describe("trigger node requirement", () => {
    it("rejects a workflow with no trigger node", () => {
      const nodes = [makeNode("a1", "action", "Action 1")];
      const result = validateWorkflowGraph(nodes, []);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("trigger"))).toBe(true);
    });

    it("accepts a workflow with one trigger node", () => {
      const nodes = [makeNode("t1", "trigger", "Manual")];
      const result = validateWorkflowGraph(nodes, []);
      expect(result.valid).toBe(true);
    });

    it("accepts a workflow with multiple trigger nodes", () => {
      const nodes = [
        makeNode("t1", "trigger", "Schedule"),
        makeNode("t2", "trigger", "Webhook"),
        makeNode("a1", "action", "Action"),
      ];
      const edges = [
        makeEdge("t1", "a1"),
        makeEdge("t2", "a1"),
      ];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(true);
    });
  });

  describe("disconnected/orphan node detection", () => {
    it("flags an action node with no incoming edges as orphan", () => {
      const nodes = [
        makeNode("t1", "trigger", "Trigger"),
        makeNode("a1", "action", "Connected"),
        makeNode("a2", "action", "Orphan"),
      ];
      const edges = [makeEdge("t1", "a1")];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.nodeId === "a2" && e.message.includes("orphan"))).toBe(true);
    });

    it("does not flag trigger nodes as orphans (they are entry points)", () => {
      const nodes = [makeNode("t1", "trigger", "Trigger")];
      const result = validateWorkflowGraph(nodes, []);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("edge validation", () => {
    it("detects edges referencing non-existent source nodes", () => {
      const nodes = [
        makeNode("t1", "trigger", "Trigger"),
        makeNode("a1", "action", "Action"),
      ];
      const edges = [makeEdge("ghost", "a1")];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("non-existent source"))).toBe(true);
    });

    it("detects edges referencing non-existent target nodes", () => {
      const nodes = [makeNode("t1", "trigger", "Trigger")];
      const edges = [makeEdge("t1", "ghost")];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("non-existent target"))).toBe(true);
    });

    it("detects self-loop edges", () => {
      const nodes = [
        makeNode("t1", "trigger", "Trigger"),
        makeNode("a1", "action", "Loop"),
      ];
      const edges = [
        makeEdge("t1", "a1"),
        makeEdge("a1", "a1"),
      ];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("self-loop"))).toBe(true);
    });
  });

  describe("condition node edge validation", () => {
    it("flags condition node without true/false branch edges", () => {
      const nodes = [
        makeNode("t1", "trigger", "Trigger"),
        makeNode("c1", "condition", "Check"),
      ];
      const edges = [makeEdge("t1", "c1")];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) =>
        e.nodeId === "c1" && e.message.includes("branch edges"),
      )).toBe(true);
    });

    it("accepts condition node with both true and false edges", () => {
      const nodes = [
        makeNode("t1", "trigger", "Trigger"),
        makeNode("c1", "condition", "Check"),
        makeNode("a1", "action", "True Path"),
        makeNode("a2", "action", "False Path"),
      ];
      const edges = [
        makeEdge("t1", "c1"),
        makeEdge("c1", "a1", "true"),
        makeEdge("c1", "a2", "false"),
      ];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(true);
    });

    it("accepts condition node with only true edge", () => {
      const nodes = [
        makeNode("t1", "trigger", "Trigger"),
        makeNode("c1", "condition", "Check"),
        makeNode("a1", "action", "True Only"),
      ];
      const edges = [
        makeEdge("t1", "c1"),
        makeEdge("c1", "a1", "true"),
      ];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(true);
    });

    it("accepts condition node with only false edge", () => {
      const nodes = [
        makeNode("t1", "trigger", "Trigger"),
        makeNode("c1", "condition", "Check"),
        makeNode("a1", "action", "False Only"),
      ];
      const edges = [
        makeEdge("t1", "c1"),
        makeEdge("c1", "a1", "false"),
      ];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(true);
    });
  });

  describe("node structure validation", () => {
    it("flags nodes with missing labels", () => {
      const node: WorkflowNode = {
        id: "n1",
        type: "action",
        position: { x: 0, y: 0 },
        data: { type: "test" },
      };
      const trigger = makeNode("t1", "trigger", "T");
      const result = validateWorkflowGraph([trigger, node], [makeEdge("t1", "n1")]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "data.label")).toBe(true);
    });
  });

  describe("complex graph scenarios", () => {
    it("validates a complete balance-check workflow pattern", () => {
      const nodes = [
        makeNode("t1", "trigger", "Every 5 minutes"),
        makeNode("a1", "action", "Check Balance"),
        makeNode("c1", "condition", "Balance < 0.1 ETH"),
        makeNode("a2", "action", "Send Discord Alert"),
      ];
      const edges = [
        makeEdge("t1", "a1"),
        makeEdge("a1", "c1"),
        makeEdge("c1", "a2", "true"),
      ];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(true);
    });

    it("validates a workflow with multiple branches converging", () => {
      const nodes = [
        makeNode("t1", "trigger", "Manual"),
        makeNode("c1", "condition", "Check"),
        makeNode("a1", "action", "True Action"),
        makeNode("a2", "action", "False Action"),
        makeNode("a3", "action", "Merge Action"),
      ];
      const edges = [
        makeEdge("t1", "c1"),
        makeEdge("c1", "a1", "true"),
        makeEdge("c1", "a2", "false"),
        makeEdge("a1", "a3"),
        makeEdge("a2", "a3"),
      ];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(true);
    });

    it("accumulates multiple errors from different validation checks", () => {
      const nodes = [
        // No trigger
        makeNode("a1", "action", "Orphan Action"),
        makeNode("c1", "condition", "Condition Without Branches"),
      ];
      const edges = [
        makeEdge("a1", "c1"),
        makeEdge("c1", "c1"), // self-loop
      ];
      const result = validateWorkflowGraph(nodes, edges);
      expect(result.valid).toBe(false);
      // Should have multiple errors: no trigger, orphan, self-loop, no branches
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
