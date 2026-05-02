// SDK surface tested: validateNodeConfig from helpers/node-validators.ts
//
// This tests the per-node field validation that is separate from the
// graph-level validation already tested in workflow-builders.test.ts.

import { describe, it, expect } from "vitest";
import { validateNodeConfig } from "../../helpers/node-validators.js";
import { createActionNode } from "../../helpers/workflow-builders.js";

describe("validateNodeConfig", () => {
  it("passes when all required fields are present", () => {
    const node = createActionNode({
      id: "a1",
      label: "Check Balance",
      actionType: "web3:getBalance",
      config: { address: "0x123", network: "ethereum" },
    });
    const result = validateNodeConfig(node, ["type", "label"]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when a required field is missing", () => {
    const node = createActionNode({
      id: "a1",
      label: "Check Balance",
      actionType: "web3:getBalance",
    });
    const result = validateNodeConfig(node, ["type", "label", "address"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.field).toBe("data.address");
    expect(result.errors[0]!.message).toContain("address");
  });

  it("fails when a required field is null", () => {
    const node = createActionNode({
      id: "a1",
      label: "Test",
      actionType: "test",
      config: { address: null },
    });
    const result = validateNodeConfig(node, ["address"]);
    expect(result.valid).toBe(false);
  });

  it("fails when a required field is empty string", () => {
    const node = createActionNode({
      id: "a1",
      label: "Test",
      actionType: "test",
      config: { address: "" },
    });
    const result = validateNodeConfig(node, ["address"]);
    expect(result.valid).toBe(false);
  });

  it("reports the correct nodeId in errors", () => {
    const node = createActionNode({
      id: "specific_node_id",
      label: "Test",
      actionType: "test",
    });
    const result = validateNodeConfig(node, ["missing_field"]);
    expect(result.errors[0]!.nodeId).toBe("specific_node_id");
  });

  it("supports nested field paths", () => {
    const node = createActionNode({
      id: "a1",
      label: "Test",
      actionType: "test",
      config: { nested: { deep: "value" } },
    });
    // "nested.deep" should resolve through data.nested.deep
    const result = validateNodeConfig(node, ["nested.deep"]);
    expect(result.valid).toBe(true);
  });

  it("fails on nested field paths when intermediate object is missing", () => {
    const node = createActionNode({
      id: "a1",
      label: "Test",
      actionType: "test",
    });
    const result = validateNodeConfig(node, ["nested.deep"]);
    expect(result.valid).toBe(false);
  });

  it("validates multiple fields and reports all failures", () => {
    const node = createActionNode({
      id: "a1",
      label: "Test",
      actionType: "test",
    });
    const result = validateNodeConfig(node, ["field1", "field2", "field3"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });
});
