// SDK surface tested: Listed workflow payment integration
//
// Maps to claude_test.md Phase 3.2 "Plugin integration tests" adapted for SDK:
//   - Free workflow call returns data
//   - Paid workflow call returns 402 challenge
//   - Paying with x402 headers succeeds
//   - Paying with MPP headers succeeds
//   - Receipt headers are preserved

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createKeeperHubClient } from "../../index.js";
import type { KeeperHubClient } from "../../index.js";
import type { PaymentChallenge, ListedWorkflowCallResult } from "../../models/payment.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(
  data: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  const responseHeaders = new Headers(headers ?? {});
  responseHeaders.set("content-type", "application/json");
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

describe("Listed workflow payment flow (mocked API)", () => {
  let client: KeeperHubClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = createKeeperHubClient({
      apiKey: "kh_test_payment",
      baseUrl: "https://test.keeperhub.com/api",
      retry: { maxAttempts: 0 },
    });
  });

  it("searches marketplace and calls a free workflow successfully", async () => {
    // Search
    mockFetch.mockResolvedValueOnce(
      jsonResponse([
        {
          id: "wf_1",
          name: "ETH Price",
          description: null,
          slug: "eth-price",
          workflowType: "read",
          category: "defi",
          chain: "ethereum",
          priceUsdcPerCall: null,
          inputSchema: null,
          organizationId: "org_1",
        },
      ]),
    );

    const listed = await client.listedWorkflows.search({ query: "eth" });
    expect(listed).toHaveLength(1);
    expect(listed[0]!.slug).toBe("eth-price");

    // Call (free)
    mockFetch.mockResolvedValueOnce(jsonResponse({ price: "3500.00" }));

    const result = await client.listedWorkflows.call("eth-price", {
      network: "mainnet",
    });

    expect("paymentRequired" in result).toBe(false);
    const callResult = result as ListedWorkflowCallResult;
    expect(callResult.data).toEqual({ price: "3500.00" });
    expect(callResult.payment).toBeUndefined();
  });

  it("handles 402 -> pay -> retry flow with x402 payment", async () => {
    // First call: 402
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          priceUsdcPerCall: "0.01",
          rails: [
            {
              rail: "x402",
              chainId: 8453,
              tokenAddress: "0xUSDC",
              recipientAddress: "0xRecip",
              amount: "10000",
            },
          ],
        },
        402,
      ),
    );

    const firstResult = await client.listedWorkflows.call("paid-workflow");
    expect("paymentRequired" in firstResult).toBe(true);
    const challenge = (firstResult as { paymentRequired: PaymentChallenge })
      .paymentRequired;
    expect(challenge.priceUsdcPerCall).toBe("0.01");
    expect(challenge.rails[0]!.rail).toBe("x402");

    // Second call: with payment proof, succeeds
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ result: "executed" }, 200, {
        "x-payment-receipt": "receipt_proof_abc",
      }),
    );

    const paidResult = await client.listedWorkflows.call(
      "paid-workflow",
      {},
      { "X-PAYMENT": "x402_proof_token" },
    );

    expect("paymentRequired" in paidResult).toBe(false);
    const callResult = paidResult as ListedWorkflowCallResult;
    expect(callResult.data).toEqual({ result: "executed" });
    expect(callResult.payment).toBeDefined();
    expect(callResult.payment!.rail).toBe("x402");
    expect(callResult.payment!.receipt!["x-payment-receipt"]).toBe(
      "receipt_proof_abc",
    );

    // Verify the payment header was sent
    const secondCallOpts = mockFetch.mock.calls[1]![1] as RequestInit;
    const headers = secondCallOpts.headers as Record<string, string>;
    expect(headers["X-PAYMENT"]).toBe("x402_proof_token");
  });

  it("handles MPP payment rail", async () => {
    // 402 with MPP rail
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          priceUsdcPerCall: "0.05",
          rails: [
            {
              rail: "mpp",
              chainId: 4217,
              tokenAddress: "0xUSDCe",
              recipientAddress: "0xRecip",
              amount: "50000",
            },
          ],
        },
        402,
      ),
    );

    const firstResult = await client.listedWorkflows.call("mpp-workflow");
    expect("paymentRequired" in firstResult).toBe(true);
    const challenge = (firstResult as { paymentRequired: PaymentChallenge })
      .paymentRequired;
    expect(challenge.rails[0]!.rail).toBe("mpp");
    expect(challenge.rails[0]!.chainId).toBe(4217);

    // Pay with MPP
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ result: "ok" }, 200, {
        "x-mpp-payment-receipt": "mpp_receipt_xyz",
      }),
    );

    const paidResult = await client.listedWorkflows.call(
      "mpp-workflow",
      {},
      { "X-MPP-PAYMENT": "mpp_proof_token" },
    );

    const callResult = paidResult as ListedWorkflowCallResult;
    expect(callResult.payment!.rail).toBe("mpp");
    expect(callResult.payment!.receipt!["x-mpp-payment-receipt"]).toBe(
      "mpp_receipt_xyz",
    );
  });

  it("handles 402 with dual rails (both x402 and mpp)", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        {
          priceUsdcPerCall: "0.02",
          rails: [
            {
              rail: "x402",
              chainId: 8453,
              tokenAddress: "0xUSDC_base",
              recipientAddress: "0xR",
              amount: "20000",
            },
            {
              rail: "mpp",
              chainId: 4217,
              tokenAddress: "0xUSDCe_tempo",
              recipientAddress: "0xR",
              amount: "20000",
            },
          ],
        },
        402,
      ),
    );

    const result = await client.listedWorkflows.call("dual-rail");
    expect("paymentRequired" in result).toBe(true);
    const challenge = (result as { paymentRequired: PaymentChallenge })
      .paymentRequired;
    expect(challenge.rails).toHaveLength(2);
    expect(challenge.rails[0]!.rail).toBe("x402");
    expect(challenge.rails[1]!.rail).toBe("mpp");
  });
});
