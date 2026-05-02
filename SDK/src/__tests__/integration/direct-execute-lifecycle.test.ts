// SDK surface tested: Direct execution lifecycle
//
// Maps to claude_test.md Phase 2.5 adapted for SDK:
//   - Transfer -> poll -> completion
//   - ContractCall -> poll -> completion
//   - CheckAndExecute with condition met
//   - Error handling for failed executions

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createKeeperHubClient } from "../../index.js";
import type { KeeperHubClient } from "../../index.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Direct execution lifecycle (mocked API)", () => {
  let client: KeeperHubClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = createKeeperHubClient({
      apiKey: "kh_test_direct",
      baseUrl: "https://test.keeperhub.com/api",
      retry: { maxAttempts: 0 },
    });
  });

  it("completes a transfer -> poll -> completed lifecycle", async () => {
    // Initiate transfer
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: "dex_1",
        type: "transfer",
        status: "pending",
        chainId: 11155111,
        input: { to: "0xRecipient", amount: "1000000000000000000" },
        output: null,
        error: null,
        transactionHash: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      }),
    );

    const transfer = await client.directExecute.transfer({
      chainId: 11155111,
      to: "0xRecipient",
      amount: "1000000000000000000",
    });
    expect(transfer.id).toBe("dex_1");
    expect(transfer.status).toBe("pending");

    // Poll: running -> completed
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          ...transfer,
          status: "running",
          transactionHash: "0xabc123",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ...transfer,
          status: "completed",
          transactionHash: "0xabc123",
          output: { txHash: "0xabc123", blockNumber: 12345 },
        }),
      );

    const completed = await client.directExecute.waitForCompletion("dex_1", {
      pollInterval: 10,
      timeout: 5000,
    });
    expect(completed.status).toBe("completed");
    expect(completed.transactionHash).toBe("0xabc123");
  });

  it("handles a failed contract call execution", async () => {
    // Initiate contract call
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: "dex_2",
        type: "contract-call",
        status: "pending",
        chainId: 1,
        input: {},
        output: null,
        error: null,
        transactionHash: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      }),
    );

    const call = await client.directExecute.contractCall({
      chainId: 1,
      contractAddress: "0xContract",
      functionName: "someFunction",
      abi: [],
      args: [],
    });
    expect(call.status).toBe("pending");

    // Poll: fails
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        ...call,
        status: "failed",
        error: "execution reverted: insufficient balance",
      }),
    );

    const result = await client.directExecute.waitForCompletion("dex_2", {
      pollInterval: 10,
    });
    expect(result.status).toBe("failed");
    expect(result.error).toBe("execution reverted: insufficient balance");
  });

  it("executes check-and-execute with condition met", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        id: "dex_3",
        type: "check-and-execute",
        status: "completed",
        chainId: 1,
        input: {},
        output: {
          checkResult: "50",
          conditionMet: true,
          executionResult: { txHash: "0xdef" },
        },
        error: null,
        transactionHash: "0xdef",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:05Z",
      }),
    );

    const result = await client.directExecute.checkAndExecute({
      chainId: 1,
      check: {
        contractAddress: "0xPrice",
        functionName: "getPrice",
        abi: [],
      },
      condition: { operator: "lt", value: "100" },
      execute: {
        contractAddress: "0xDex",
        functionName: "buy",
        abi: [],
        args: [1],
      },
    });

    expect(result.status).toBe("completed");
    expect(result.transactionHash).toBe("0xdef");
  });
});
