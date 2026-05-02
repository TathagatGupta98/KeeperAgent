// SDK surface tested: ListedWorkflowsModule
//
// Methods:
//   search(options?) -> ListedWorkflowView[]   GET /mcp/workflows
//   call(slug, input?, payment?) -> ListedWorkflowCallResult | { paymentRequired }
//     Uses http.raw("POST", /mcp/workflows/:slug/call)
//     Parses 402 into PaymentChallenge
//     Preserves response headers as receipt metadata

import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeeperKitHttpClient } from "../../client/http.js";
import { ListedWorkflowsModule } from "../../modules/listed-workflows.js";
import type { ListedWorkflowView } from "../../models/workflow.js";
import type { PaymentChallenge, ListedWorkflowCallResult } from "../../models/payment.js";

const mockRequest = vi.fn();
const mockRaw = vi.fn();
const httpStub = {
  request: mockRequest,
  raw: mockRaw,
} as unknown as KeeperKitHttpClient;

const MOCK_LISTED: ListedWorkflowView = {
  id: "wf_listed_1",
  name: "ETH Price Checker",
  description: "Returns current ETH price",
  slug: "eth-price-checker",
  workflowType: "read",
  category: "defi",
  chain: "ethereum",
  priceUsdcPerCall: null,
  inputSchema: null,
  organizationId: "org_1",
};

function createMockResponse(
  body: unknown,
  status: number,
  headers?: Record<string, string>,
): Response {
  const responseHeaders = new Headers(headers ?? {});
  responseHeaders.set("content-type", "application/json");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

describe("ListedWorkflowsModule", () => {
  let mod: ListedWorkflowsModule;

  beforeEach(() => {
    vi.clearAllMocks();
    mod = new ListedWorkflowsModule(httpStub);
  });

  describe("search", () => {
    it("calls GET /mcp/workflows with no query params by default", async () => {
      mockRequest.mockResolvedValueOnce([MOCK_LISTED]);
      const result = await mod.search();

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("GET");
      expect(opts.path).toBe("/mcp/workflows");
      expect(result).toHaveLength(1);
    });

    it("maps query to q param and passes category and chain", async () => {
      mockRequest.mockResolvedValueOnce([]);
      await mod.search({ query: "eth", category: "defi", chain: "ethereum" });

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.query.q).toBe("eth");
      expect(opts.query.category).toBe("defi");
      expect(opts.query.chain).toBe("ethereum");
    });
  });

  describe("call", () => {
    it("returns result data for a successful free call", async () => {
      const responseBody = { price: "3500.00" };
      mockRaw.mockResolvedValueOnce(createMockResponse(responseBody, 200));

      const result = await mod.call("eth-price-checker", { network: "mainnet" });

      expect(mockRaw).toHaveBeenCalledOnce();
      const [method, path, opts] = mockRaw.mock.calls[0]!;
      expect(method).toBe("POST");
      expect(path).toBe("/mcp/workflows/eth-price-checker/call");
      expect(opts.body).toEqual({ network: "mainnet" });

      // Should not be a paymentRequired result
      expect("paymentRequired" in result).toBe(false);
      const callResult = result as ListedWorkflowCallResult;
      expect(callResult.data).toEqual(responseBody);
    });

    it("sends empty object body when no input provided", async () => {
      mockRaw.mockResolvedValueOnce(createMockResponse({ ok: true }, 200));
      await mod.call("slug");

      const opts = mockRaw.mock.calls[0]![2];
      expect(opts.body).toEqual({});
    });

    it("passes payment headers when provided", async () => {
      mockRaw.mockResolvedValueOnce(createMockResponse({ result: "ok" }, 200));
      await mod.call("paid-workflow", {}, { "X-PAYMENT": "proof_abc" });

      const opts = mockRaw.mock.calls[0]![2];
      expect(opts.headers["X-PAYMENT"]).toBe("proof_abc");
    });

    it("omits undefined payment header values", async () => {
      mockRaw.mockResolvedValueOnce(createMockResponse({ result: "ok" }, 200));
      await mod.call("paid-workflow", {}, { "X-PAYMENT": undefined, "X-MPP-PAYMENT": "mpp_proof" });

      const opts = mockRaw.mock.calls[0]![2];
      expect(opts.headers["X-PAYMENT"]).toBeUndefined();
      expect(opts.headers["X-MPP-PAYMENT"]).toBe("mpp_proof");
    });

    it("parses 402 response into structured PaymentChallenge", async () => {
      const challengeBody = {
        priceUsdcPerCall: "0.01",
        rails: [
          {
            rail: "x402",
            chainId: 8453,
            tokenAddress: "0xUSDC",
            recipientAddress: "0xRecipient",
            amount: "10000",
          },
          {
            rail: "mpp",
            chainId: 4217,
            tokenAddress: "0xUSDCe",
            recipientAddress: "0xRecipient",
            amount: "10000",
          },
        ],
      };
      mockRaw.mockResolvedValueOnce(createMockResponse(challengeBody, 402));

      const result = await mod.call("paid-workflow");

      expect("paymentRequired" in result).toBe(true);
      const challenge = (result as { paymentRequired: PaymentChallenge })
        .paymentRequired;
      expect(challenge.slug).toBe("paid-workflow");
      expect(challenge.priceUsdcPerCall).toBe("0.01");
      expect(challenge.rails).toHaveLength(2);
      expect(challenge.rails[0]!.rail).toBe("x402");
      expect(challenge.rails[0]!.chainId).toBe(8453);
      expect(challenge.rails[1]!.rail).toBe("mpp");
    });

    it("handles 402 with empty body gracefully", async () => {
      // Simulate a 402 where json() fails
      const response = new Response("payment required", {
        status: 402,
        headers: { "content-type": "text/plain" },
      });
      mockRaw.mockResolvedValueOnce(response);

      const result = await mod.call("broken-workflow");

      expect("paymentRequired" in result).toBe(true);
      const challenge = (result as { paymentRequired: PaymentChallenge })
        .paymentRequired;
      expect(challenge.slug).toBe("broken-workflow");
      expect(challenge.rails).toEqual([]);
    });

    it("throws mapped error for non-402 error responses", async () => {
      mockRaw.mockResolvedValueOnce(
        createMockResponse({ message: "not found" }, 404),
      );

      await expect(mod.call("nonexistent")).rejects.toThrow("not found");
    });

    it("extracts x402 payment receipt from response headers", async () => {
      const responseHeaders = {
        "x-payment-receipt": "receipt_abc",
      };
      mockRaw.mockResolvedValueOnce(
        createMockResponse({ result: "done" }, 200, responseHeaders),
      );

      const result = await mod.call("paid-workflow", {}, { "X-PAYMENT": "proof" });

      expect("paymentRequired" in result).toBe(false);
      const callResult = result as ListedWorkflowCallResult;
      expect(callResult.payment).toBeDefined();
      expect(callResult.payment!.rail).toBe("x402");
      expect(callResult.payment!.receipt!["x-payment-receipt"]).toBe(
        "receipt_abc",
      );
    });

    it("extracts MPP payment receipt from response headers", async () => {
      const responseHeaders = {
        "x-mpp-payment-receipt": "mpp_receipt_abc",
      };
      mockRaw.mockResolvedValueOnce(
        createMockResponse({ result: "done" }, 200, responseHeaders),
      );

      const result = await mod.call("paid-workflow");

      const callResult = result as ListedWorkflowCallResult;
      expect(callResult.payment).toBeDefined();
      expect(callResult.payment!.rail).toBe("mpp");
    });

    it("returns undefined payment when no receipt headers present", async () => {
      mockRaw.mockResolvedValueOnce(
        createMockResponse({ result: "ok" }, 200),
      );

      const result = await mod.call("free-workflow");

      const callResult = result as ListedWorkflowCallResult;
      expect(callResult.payment).toBeUndefined();
    });
  });
});
