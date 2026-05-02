/**
 * Workflow builder and validator helper tests.
 */

import { describe, it, expect } from "vitest";
import {
  createTriggerNode,
  createActionNode,
  createConditionNode,
  createEdge,
  createConditionEdges,
  templateRef,
} from "../../helpers/workflow-builders.js";
import { validateWorkflowGraph } from "../../helpers/node-validators.js";

describe("createTriggerNode", () => {
  it("creates a trigger node with correct structure", () => {
    const node = createTriggerNode({
      id: "t1",
      label: "Every 5 min",
      triggerType: "schedule",
      config: { cron: "*/5 * * * *" },
    });
    expect(node.id).toBe("t1");
    expect(node.type).toBe("trigger");
    expect(node.data.type).toBe("schedule");
    expect(node.data.label).toBe("Every 5 min");
    expect(node.data.cron).toBe("*/5 * * * *");
  });
});

describe("createActionNode", () => {
  it("creates an action node", () => {
    const node = createActionNode({
      id: "a1",
      label: "Check Balance",
      actionType: "web3:getBalance",
    });
    expect(node.type).toBe("action");
    expect(node.data.type).toBe("web3:getBalance");
  });
});

describe("createConditionNode", () => {
  it("creates a condition node", () => {
    const node = createConditionNode({
      id: "c1",
      label: "Balance < 0.1 ETH",
      expression: "value < 100000000000000000",
    });
    expect(node.type).toBe("condition");
    expect(node.data.expression).toBe("value < 100000000000000000");
  });
});

describe("createEdge / createConditionEdges", () => {
  it("creates a simple edge", () => {
    const edge = createEdge({ source: "t1", target: "a1" });
    expect(edge.source).toBe("t1");
    expect(edge.target).toBe("a1");
  });

  it("creates condition edges with correct handles", () => {
    const [trueEdge, falseEdge] = createConditionEdges("c1", "a1", "a2");
    expect(trueEdge.sourceHandle).toBe("true");
    expect(trueEdge.target).toBe("a1");
    expect(falseEdge.sourceHandle).toBe("false");
    expect(falseEdge.target).toBe("a2");
  });
});

describe("templateRef", () => {
  it("builds correct template reference", () => {
    const ref = templateRef("node_1", "Check Balance", "result.balance");
    expect(ref).toBe("{{@node_1:Check Balance.result.balance}}");
  });
});

describe("validateWorkflowGraph", () => {
  it("passes for a valid simple workflow", () => {
    const trigger = createTriggerNode({
      id: "t1",
      label: "Manual",
      triggerType: "manual",
    });
    const action = createActionNode({
      id: "a1",
      label: "Do Thing",
      actionType: "test",
    });
    const edge = createEdge({ source: "t1", target: "a1" });

    const result = validateWorkflowGraph([trigger, action], [edge]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when no trigger node is present", () => {
    const action = createActionNode({
      id: "a1",
      label: "Do Thing",
      actionType: "test",
    });
    const result = validateWorkflowGraph([action], []);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("trigger"))).toBe(true);
  });

  it("detects orphan nodes", () => {
    const trigger = createTriggerNode({
      id: "t1",
      label: "Manual",
      triggerType: "manual",
    });
    const action = createActionNode({
      id: "a1",
      label: "Orphan",
      actionType: "test",
    });
    const result = validateWorkflowGraph([trigger, action], []);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("orphan"))).toBe(true);
  });

  it("detects edges to non-existent nodes", () => {
    const trigger = createTriggerNode({
      id: "t1",
      label: "Manual",
      triggerType: "manual",
    });
    const edge = createEdge({ source: "t1", target: "nonexistent" });
    const result = validateWorkflowGraph([trigger], [edge]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("non-existent"))).toBe(
      true,
    );
  });

  it("warns about condition nodes without branch edges", () => {
    const trigger = createTriggerNode({
      id: "t1",
      label: "Manual",
      triggerType: "manual",
    });
    const cond = createConditionNode({
      id: "c1",
      label: "Check",
    });
    const edge = createEdge({ source: "t1", target: "c1" });
    const result = validateWorkflowGraph([trigger, cond], [edge]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("branch edges"))).toBe(
      true,
    );
  });
});
