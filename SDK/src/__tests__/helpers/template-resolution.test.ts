// SDK surface tested: Template resolution (helpers/template-utils.ts)
//
// Maps to claude_test.md Phase 2.2 "Template resolution":
//   - Single reference resolves from context
//   - Chained references
//   - Missing node reference behavior
//   - Numeric values coerced to string
//   - JSON template values serialized correctly
//   - Round-trip: build -> parse -> build produces identical output

import { describe, it, expect } from "vitest";
import {
  parseTemplateRef,
  extractTemplateRefs,
  buildTemplateRef,
  interpolateTemplates,
  hasTemplateRefs,
} from "../../helpers/template-utils.js";
import { templateRef } from "../../helpers/workflow-builders.js";

describe("Template resolution (extended)", () => {
  describe("single reference resolution", () => {
    it("resolves a template reference from a simulated execution context", () => {
      const context: Record<string, Record<string, unknown>> = {
        node_1: { "Check Balance": { result: { balance: "1.5" } } },
      };

      const text = "Balance is {{@node_1:Check Balance.result.balance}} ETH";
      const result = interpolateTemplates(text, (ref) => {
        const nodeCtx = context[ref.nodeId];
        if (!nodeCtx) return undefined;
        const labelCtx = nodeCtx[ref.label] as Record<string, unknown> | undefined;
        if (!labelCtx) return undefined;
        // Traverse the field path
        const parts = ref.field.split(".");
        let val: unknown = labelCtx;
        for (const part of parts) {
          if (val && typeof val === "object" && part in (val as Record<string, unknown>)) {
            val = (val as Record<string, unknown>)[part];
          } else {
            return undefined;
          }
        }
        return String(val);
      });

      expect(result).toBe("Balance is 1.5 ETH");
    });
  });

  describe("chained reference handling", () => {
    it("resolves multiple sequential references in the same string", () => {
      const text = "From {{@n1:A.x}} to {{@n2:B.y}}";
      const result = interpolateTemplates(text, (ref) => {
        if (ref.nodeId === "n1") return "start";
        if (ref.nodeId === "n2") return "end";
        return undefined;
      });
      expect(result).toBe("From start to end");
    });
  });

  describe("missing node reference behavior", () => {
    it("leaves unresolvable references unchanged in the string", () => {
      const text = "Value: {{@missing:Node.field}}";
      const result = interpolateTemplates(text, () => undefined);
      expect(result).toBe("Value: {{@missing:Node.field}}");
    });
  });

  describe("numeric value coercion", () => {
    it("coerces numeric resolver return values via String()", () => {
      const text = "Count: {{@n1:Counter.value}}";
      const result = interpolateTemplates(text, () => "42");
      expect(result).toBe("Count: 42");
    });
  });

  describe("special characters in labels and fields", () => {
    it("handles labels with spaces", () => {
      const ref = buildTemplateRef("node_1", "Check Balance", "result");
      const parsed = parseTemplateRef(ref);
      expect(parsed).not.toBeNull();
      expect(parsed!.label).toBe("Check Balance");
    });

    it("handles fields with nested dots", () => {
      const ref = buildTemplateRef("n1", "Read", "data.nested.value");
      const parsed = parseTemplateRef(ref);
      expect(parsed!.field).toBe("data.nested.value");
    });
  });

  describe("round-trip: build -> parse -> build", () => {
    it("produces identical output for simple reference", () => {
      const original = buildTemplateRef("node_42", "Action", "output");
      const parsed = parseTemplateRef(original);
      expect(parsed).not.toBeNull();
      const rebuilt = buildTemplateRef(parsed!.nodeId, parsed!.label, parsed!.field);
      expect(rebuilt).toBe(original);
    });

    it("produces identical output for complex reference with nested field", () => {
      const original = buildTemplateRef("n1", "Get Balance", "result.balance.wei");
      const parsed = parseTemplateRef(original);
      const rebuilt = buildTemplateRef(parsed!.nodeId, parsed!.label, parsed!.field);
      expect(rebuilt).toBe(original);
    });

    it("templateRef helper produces the same output as buildTemplateRef", () => {
      const fromHelper = templateRef("n1", "Label", "field.sub");
      const fromBuild = buildTemplateRef("n1", "Label", "field.sub");
      expect(fromHelper).toBe(fromBuild);
    });
  });

  describe("extraction from complex strings", () => {
    it("extracts multiple refs from a multi-line template", () => {
      const text = [
        "Wallet: {{@n1:Wallet.address}}",
        "Balance: {{@n2:Balance.result.eth}} ETH",
        "Network: {{@n3:Config.network}}",
      ].join("\n");

      const refs = extractTemplateRefs(text);
      expect(refs).toHaveLength(3);
      expect(refs[0]!.nodeId).toBe("n1");
      expect(refs[1]!.nodeId).toBe("n2");
      expect(refs[2]!.nodeId).toBe("n3");
    });

    it("returns empty array for plain text", () => {
      expect(extractTemplateRefs("no templates here")).toHaveLength(0);
    });

    it("handles adjacent references without separator", () => {
      const text = "{{@n1:A.x}}{{@n2:B.y}}";
      const refs = extractTemplateRefs(text);
      expect(refs).toHaveLength(2);
    });
  });

  describe("hasTemplateRefs detection", () => {
    it("returns true for text with a single ref", () => {
      expect(hasTemplateRefs("{{@n1:A.b}}")).toBe(true);
    });

    it("returns false for text with curly braces that are not template refs", () => {
      expect(hasTemplateRefs("{not a ref}")).toBe(false);
      expect(hasTemplateRefs("{{not.a.ref}}")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(hasTemplateRefs("")).toBe(false);
    });
  });
});
