// SDK surface tested: ExecutionsModule
//
// Methods:
//   listByWorkflow(workflowId) -> WorkflowExecution[]     GET  /workflows/:id/executions
//   getStatus(executionId) -> ExecutionProgress            GET  /workflows/executions/:id/status
//   getLogs(executionId) -> ExecutionLog[]                 GET  /workflows/executions/:id/logs
//   cancel(executionId) -> void                           POST /executions/:id/cancel
//   deleteHistory(workflowId) -> void                     DELETE /workflows/:id/executions
//   waitForCompletion(executionId, options?) -> WorkflowExecution  (polling)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeeperKitHttpClient } from "../../client/http.js";
import { ExecutionsModule } from "../../modules/executions.js";
import type {
  WorkflowExecution,
  ExecutionProgress,
  ExecutionLog,
} from "../../models/execution.js";

const mockRequest = vi.fn();
const httpStub = { request: mockRequest } as unknown as KeeperKitHttpClient;

const MOCK_EXECUTION: WorkflowExecution = {
  id: "exec_1",
  workflowId: "wf_1",
  status: "success",
  input: { trigger: "manual" },
  output: { result: "ok" },
  error: null,
  startedAt: "2026-01-01T00:00:00Z",
  completedAt: "2026-01-01T00:00:05Z",
  duration: 5000,
  totalSteps: 3,
  completedSteps: 3,
  currentNodeId: null,
  currentNodeName: null,
  lastSuccessfulNodeId: "node_3",
  lastSuccessfulNodeName: "Notify",
  executionTrace: ["node_1", "node_2", "node_3"],
  runId: "run_1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:05Z",
};

const MOCK_PROGRESS: ExecutionProgress = {
  id: "exec_1",
  status: "running",
  totalSteps: 3,
  completedSteps: 1,
  currentNodeId: "node_2",
  currentNodeName: "Check Balance",
};

const MOCK_LOG: ExecutionLog = {
  id: "log_1",
  executionId: "exec_1",
  nodeId: "node_1",
  nodeName: "Trigger",
  nodeType: "trigger",
  status: "success",
  input: {},
  output: { timestamp: "2026-01-01T00:00:00Z" },
  error: null,
  startedAt: "2026-01-01T00:00:00Z",
  completedAt: "2026-01-01T00:00:01Z",
  duration: 1000,
  iterationIndex: null,
  forEachNodeId: null,
};

describe("ExecutionsModule", () => {
  let mod: ExecutionsModule;

  beforeEach(() => {
    vi.clearAllMocks();
    mod = new ExecutionsModule(httpStub);
  });

  describe("listByWorkflow", () => {
    it("calls GET /workflows/:id/executions", async () => {
      mockRequest.mockResolvedValueOnce([MOCK_EXECUTION]);
      const result = await mod.listByWorkflow("wf_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("GET");
      expect(opts.path).toBe("/workflows/wf_1/executions");
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("exec_1");
    });
  });

  describe("getStatus", () => {
    it("calls GET /workflows/executions/:id/status", async () => {
      mockRequest.mockResolvedValueOnce(MOCK_PROGRESS);
      const result = await mod.getStatus("exec_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("GET");
      expect(opts.path).toBe("/workflows/executions/exec_1/status");
      expect(result.status).toBe("running");
      expect(result.currentNodeName).toBe("Check Balance");
    });
  });

  describe("getLogs", () => {
    it("calls GET /workflows/executions/:id/logs", async () => {
      mockRequest.mockResolvedValueOnce([MOCK_LOG]);
      const result = await mod.getLogs("exec_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("GET");
      expect(opts.path).toBe("/workflows/executions/exec_1/logs");
      expect(result).toHaveLength(1);
      expect(result[0]!.nodeId).toBe("node_1");
    });
  });

  describe("cancel", () => {
    it("calls POST /executions/:id/cancel", async () => {
      mockRequest.mockResolvedValueOnce(undefined);
      await mod.cancel("exec_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("POST");
      expect(opts.path).toBe("/executions/exec_1/cancel");
    });
  });

  describe("deleteHistory", () => {
    it("calls DELETE /workflows/:id/executions", async () => {
      mockRequest.mockResolvedValueOnce(undefined);
      await mod.deleteHistory("wf_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("DELETE");
      expect(opts.path).toBe("/workflows/wf_1/executions");
    });
  });

  describe("waitForCompletion", () => {
    it("polls until terminal status and returns full execution", async () => {
      // First poll: still running
      mockRequest.mockResolvedValueOnce({
        ...MOCK_PROGRESS,
        status: "running",
      });
      // Second poll: completed
      mockRequest.mockResolvedValueOnce({
        ...MOCK_PROGRESS,
        status: "success",
      });
      // Third call: fetch full execution
      mockRequest.mockResolvedValueOnce(MOCK_EXECUTION);

      const result = await mod.waitForCompletion("exec_1", {
        pollInterval: 10,
        timeout: 5000,
      });

      expect(mockRequest).toHaveBeenCalledTimes(3);
      expect(result.status).toBe("success");
      expect(result.id).toBe("exec_1");
    });

    it("returns immediately when first poll shows terminal status", async () => {
      mockRequest.mockResolvedValueOnce({
        ...MOCK_PROGRESS,
        status: "error",
      });
      mockRequest.mockResolvedValueOnce({
        ...MOCK_EXECUTION,
        status: "error",
      });

      const result = await mod.waitForCompletion("exec_1", {
        pollInterval: 10,
      });

      expect(mockRequest).toHaveBeenCalledTimes(2);
      expect(result.status).toBe("error");
    });

    it("handles cancelled status as terminal", async () => {
      mockRequest.mockResolvedValueOnce({
        ...MOCK_PROGRESS,
        status: "cancelled",
      });
      mockRequest.mockResolvedValueOnce({
        ...MOCK_EXECUTION,
        status: "cancelled",
      });

      const result = await mod.waitForCompletion("exec_1", {
        pollInterval: 10,
      });

      expect(result.status).toBe("cancelled");
    });

    it("throws on timeout when execution does not complete", async () => {
      // Always return running
      mockRequest.mockResolvedValue({
        ...MOCK_PROGRESS,
        status: "running",
      });

      await expect(
        mod.waitForCompletion("exec_1", {
          timeout: 50,
          pollInterval: 10,
        }),
      ).rejects.toThrow("did not complete within 50ms");
    });
  });
});
