// SDK surface tested: DirectExecuteModule
//
// Methods:
//   transfer(input) -> DirectExecution           POST /api/execute/transfer
//   contractCall(input) -> DirectExecution        POST /api/execute/contract-call
//   checkAndExecute(input) -> DirectExecution     POST /api/execute/check-and-execute
//   getStatus(executionId) -> DirectExecution     GET  /api/execute/:id/status
//   waitForCompletion(executionId, opts?) -> DirectExecution  (polling)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeeperKitHttpClient } from "../../client/http.js";
import { DirectExecuteModule } from "../../modules/direct-execute.js";
import type {
  DirectExecution,
  TransferInput,
  ContractCallInput,
  CheckAndExecuteInput,
} from "../../models/direct-execution.js";

const mockRequest = vi.fn();
const httpStub = { request: mockRequest } as unknown as KeeperKitHttpClient;

const MOCK_EXEC: DirectExecution = {
  id: "dex_1",
  type: "transfer",
  status: "completed",
  chainId: 11155111,
  input: {},
  output: { txHash: "0xabc" },
  error: null,
  transactionHash: "0xabc",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:05Z",
};

describe("DirectExecuteModule", () => {
  let mod: DirectExecuteModule;

  beforeEach(() => {
    vi.clearAllMocks();
    mod = new DirectExecuteModule(httpStub);
  });

  describe("transfer", () => {
    it("calls POST /api/execute/transfer with the correct body", async () => {
      mockRequest.mockResolvedValueOnce(MOCK_EXEC);
      const input: TransferInput = {
        network: "sepolia",
        recipientAddress: "0x1234567890abcdef1234567890abcdef12345678",
        amount: "1000000000000000000",
      };
      const result = await mod.transfer(input);

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("POST");
      expect(opts.path).toBe("/api/execute/transfer");
      expect(opts.headers?.["X-API-Key"]).toBeUndefined();
      expect(opts.body).toEqual({
        network: "sepolia",
        recipientAddress: "0x1234567890abcdef1234567890abcdef12345678",
        amount: "1000000000000000000",
        tokenAddress: undefined,
        tokenConfig: undefined,
        gasLimitMultiplier: undefined,
        integrationId: undefined,
      });
      expect(result.id).toBe("dex_1");
    });

    it("includes tokenAddress for ERC-20 transfers", async () => {
      mockRequest.mockResolvedValueOnce(MOCK_EXEC);
      const input: TransferInput = {
        network: "sepolia",
        recipientAddress: "0x1234567890abcdef1234567890abcdef12345678",
        amount: "1000000",
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      };
      await mod.transfer(input);

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.body.tokenAddress).toBe(
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      );
    });
  });

  describe("contractCall", () => {
    it("calls POST /api/execute/contract-call with ABI and args", async () => {
      mockRequest.mockResolvedValueOnce({
        ...MOCK_EXEC,
        type: "contract-call",
      });
      const input: ContractCallInput = {
        network: "ethereum",
        contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        functionName: "balanceOf",
        abi: [
          {
            type: "function",
            name: "balanceOf",
            inputs: [{ name: "account", type: "address" }],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        args: ["0x1234567890abcdef1234567890abcdef12345678"],
      };
      const result = await mod.contractCall(input);

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("POST");
      expect(opts.path).toBe("/api/execute/contract-call");
      expect(opts.body.functionName).toBe("balanceOf");
      expect(result.type).toBe("contract-call");
    });
  });

  describe("checkAndExecute", () => {
    it("calls POST /api/execute/check-and-execute with check/condition/execute", async () => {
      mockRequest.mockResolvedValueOnce({
        ...MOCK_EXEC,
        type: "check-and-execute",
      });
      const input: CheckAndExecuteInput = {
        network: "ethereum",
        check: {
          contractAddress: "0xContract",
          functionName: "getValue",
          abi: [],
        },
        condition: {
          operator: "lt",
          value: "100",
        },
        execute: {
          contractAddress: "0xContract",
          functionName: "setValue",
          abi: [],
          args: [200],
        },
      };
      const result = await mod.checkAndExecute(input);

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("POST");
      expect(opts.path).toBe("/api/execute/check-and-execute");
      expect(opts.body.condition.operator).toBe("lt");
      expect(result.type).toBe("check-and-execute");
    });
  });

  describe("getStatus", () => {
    it("calls GET /api/execute/:id/status", async () => {
      mockRequest.mockResolvedValueOnce(MOCK_EXEC);
      const result = await mod.getStatus("dex_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("GET");
      expect(opts.path).toBe("/api/execute/dex_1/status");
      expect(result.status).toBe("completed");
    });
  });

  describe("waitForCompletion", () => {
    it("polls until completed and returns the execution", async () => {
      mockRequest
        .mockResolvedValueOnce({ ...MOCK_EXEC, status: "running" })
        .mockResolvedValueOnce({ ...MOCK_EXEC, status: "completed" });

      const result = await mod.waitForCompletion("dex_1", {
        pollInterval: 10,
        timeout: 5000,
      });

      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(result.status).toBe("completed");
    });

    it("returns on failed status as terminal", async () => {
      mockRequest.mockResolvedValueOnce({ ...MOCK_EXEC, status: "failed" });

      const result = await mod.waitForCompletion("dex_1", {
        pollInterval: 10,
      });

      expect(result.status).toBe("failed");
    });

    it("throws on timeout", async () => {
      mockRequest.mockResolvedValue({ ...MOCK_EXEC, status: "pending" });

      await expect(
        mod.waitForCompletion("dex_1", {
          timeout: 50,
          pollInterval: 10,
        }),
      ).rejects.toThrow("did not complete within 50ms");
    });
  });
});
