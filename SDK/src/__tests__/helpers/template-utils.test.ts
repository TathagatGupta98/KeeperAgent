/**
 * Template utilities tests.
 */

import { describe, it, expect } from "vitest";
import {
  parseTemplateRef,
  extractTemplateRefs,
  buildTemplateRef,
  interpolateTemplates,
  hasTemplateRefs,
} from "../../helpers/template-utils.js";

describe("parseTemplateRef", () => {
  it("parses a valid template reference", () => {
    const ref = parseTemplateRef("{{@node_1:Check Balance.result.balance}}");
    expect(ref).toEqual({
      nodeId: "node_1",
      label: "Check Balance",
      field: "result.balance",
    });
  });

  it("returns null for invalid input", () => {
    expect(parseTemplateRef("not a ref")).toBeNull();
    expect(parseTemplateRef("{{missing}}")).toBeNull();
  });
});

describe("extractTemplateRefs", () => {
  it("extracts multiple refs from text", () => {
    const text =
      'Balance is {{@n1:Balance.value}} and price is {{@n2:Price.usd}}';
    const refs = extractTemplateRefs(text);
    expect(refs).toHaveLength(2);
    expect(refs[0]!.nodeId).toBe("n1");
    expect(refs[1]!.nodeId).toBe("n2");
  });

  it("returns empty for text with no refs", () => {
    expect(extractTemplateRefs("no refs here")).toHaveLength(0);
  });
});

describe("buildTemplateRef", () => {
  it("builds correct format", () => {
    expect(buildTemplateRef("n1", "Check", "output.val")).toBe(
      "{{@n1:Check.output.val}}",
    );
  });
});

describe("interpolateTemplates", () => {
  it("replaces refs using resolver", () => {
    const text = "Balance: {{@n1:Balance.value}} ETH";
    const result = interpolateTemplates(text, (ref) => {
      if (ref.nodeId === "n1") return "1.5";
      return undefined;
    });
    expect(result).toBe("Balance: 1.5 ETH");
  });

  it("keeps unresolved refs unchanged", () => {
    const text = "{{@n1:X.y}}";
    const result = interpolateTemplates(text, () => undefined);
    expect(result).toBe("{{@n1:X.y}}");
  });
});

describe("hasTemplateRefs", () => {
  it("returns true when refs exist", () => {
    expect(hasTemplateRefs("{{@n1:A.b}}")).toBe(true);
  });
  it("returns false when no refs", () => {
    expect(hasTemplateRefs("no refs")).toBe(false);
  });
});
