// SDK surface tested: WorkflowsModule
//
// Methods:
//   list(options?) -> Workflow[]           GET  /workflows
//   get(workflowId) -> Workflow            GET  /workflows/:id
//   create(input) -> Workflow              POST /workflows
//   update(workflowId, input) -> Workflow  PATCH /workflows/:id
//   delete(workflowId, options?) -> void   DELETE /workflows/:id
//   execute(workflowId, input?) -> { executionId }  POST /workflows/:id/execute
//   duplicate(workflowId) -> Workflow      POST /workflows/:id/duplicate
//   download(workflowId) -> unknown        GET  /workflows/:id/download
//   goLive(workflowId, options) -> Workflow POST /workflows/:id/go-live

import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeeperKitHttpClient } from "../../client/http.js";
import { WorkflowsModule } from "../../modules/workflows.js";
import type {
  Workflow,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  GoLiveInput,
} from "../../models/workflow.js";

// Stub http.request and http.raw
const mockRequest = vi.fn();
const mockRaw = vi.fn();
const httpStub = {
  request: mockRequest,
  raw: mockRaw,
} as unknown as KeeperKitHttpClient;

const MOCK_WORKFLOW: Workflow = {
  id: "wf_1",
  name: "Balance Monitor",
  description: "Monitors wallet balance",
  userId: "user_1",
  organizationId: "org_1",
  nodes: [],
  edges: [],
  visibility: "private",
  enabled: true,
  projectId: null,
  tagId: null,
  isListed: false,
  listedSlug: null,
  listedAt: null,
  inputSchema: null,
  outputMapping: null,
  priceUsdcPerCall: null,
  workflowType: "read",
  category: null,
  chain: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("WorkflowsModule", () => {
  let mod: WorkflowsModule;

  beforeEach(() => {
    vi.clearAllMocks();
    mod = new WorkflowsModule(httpStub);
  });

  describe("list", () => {
    it("calls GET /workflows with no query params by default", async () => {
      mockRequest.mockResolvedValueOnce([MOCK_WORKFLOW]);
      const result = await mod.list();

      expect(mockRequest).toHaveBeenCalledOnce();
      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("GET");
      expect(opts.path).toBe("/workflows");
      expect(result).toEqual([MOCK_WORKFLOW]);
    });

    it("passes projectId and tagId as query params when provided", async () => {
      mockRequest.mockResolvedValueOnce([]);
      await mod.list({ projectId: "p1", tagId: "t1" });

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.query.projectId).toBe("p1");
      expect(opts.query.tagId).toBe("t1");
    });

    it("omits undefined query params", async () => {
      mockRequest.mockResolvedValueOnce([]);
      await mod.list({ projectId: "p1" });

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.query.projectId).toBe("p1");
      expect(opts.query.tagId).toBeUndefined();
    });
  });

  describe("get", () => {
    it("calls GET /workflows/:id with the correct ID", async () => {
      mockRequest.mockResolvedValueOnce(MOCK_WORKFLOW);
      const result = await mod.get("wf_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("GET");
      expect(opts.path).toBe("/workflows/wf_1");
      expect(result.id).toBe("wf_1");
    });
  });

  describe("create", () => {
    it("calls POST /workflows/create with the input body", async () => {
      mockRequest.mockResolvedValueOnce(MOCK_WORKFLOW);
      const input: CreateWorkflowInput = {
        name: "New Workflow",
        nodes: [],
        edges: [],
      };
      const result = await mod.create(input);

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("POST");
      expect(opts.path).toBe("/workflows/create");
      expect(opts.body).toEqual(input);
      expect(result).toEqual(MOCK_WORKFLOW);
    });
  });

  describe("update", () => {
    it("calls PATCH /workflows/:id with partial update body", async () => {
      mockRequest.mockResolvedValueOnce({
        ...MOCK_WORKFLOW,
        name: "Updated",
      });
      const input: UpdateWorkflowInput = { name: "Updated" };
      const result = await mod.update("wf_1", input);

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("PATCH");
      expect(opts.path).toBe("/workflows/wf_1");
      expect(opts.body).toEqual(input);
      expect(result.name).toBe("Updated");
    });
  });

  describe("delete", () => {
    it("calls DELETE /workflows/:id", async () => {
      mockRequest.mockResolvedValueOnce(undefined);
      await mod.delete("wf_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("DELETE");
      expect(opts.path).toBe("/workflows/wf_1");
    });

    it("passes force=true as a query param when specified", async () => {
      mockRequest.mockResolvedValueOnce(undefined);
      await mod.delete("wf_1", { force: true });

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.query.force).toBe(true);
    });

    it("does not include force in query when not specified", async () => {
      mockRequest.mockResolvedValueOnce(undefined);
      await mod.delete("wf_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.query?.force).toBeUndefined();
    });
  });

  describe("execute", () => {
    it("calls POST /workflow/:id/execute and returns executionId", async () => {
      mockRequest.mockResolvedValueOnce({ executionId: "exec_1", runId: "run_1", status: "running" });
      const result = await mod.execute("wf_1", { key: "value" });

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("POST");
      expect(opts.path).toBe("/workflow/wf_1/execute");
      expect(opts.body).toEqual({ key: "value" });
      expect(result.executionId).toBe("exec_1");
      expect(result.runId).toBe("run_1");
      expect(result.status).toBe("running");
    });

    it("sends empty object when no input provided", async () => {
      mockRequest.mockResolvedValueOnce({ executionId: "exec_2" });
      await mod.execute("wf_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.body).toEqual({});
    });
  });

  describe("duplicate", () => {
    it("calls POST /workflows/:id/duplicate", async () => {
      const duplicated = { ...MOCK_WORKFLOW, id: "wf_2" };
      mockRequest.mockResolvedValueOnce(duplicated);
      const result = await mod.duplicate("wf_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("POST");
      expect(opts.path).toBe("/workflows/wf_1/duplicate");
      expect(result.id).toBe("wf_2");
    });
  });

  describe("download", () => {
    it("calls GET /workflows/:id/download", async () => {
      const definition = { nodes: [], edges: [] };
      mockRequest.mockResolvedValueOnce(definition);
      const result = await mod.download("wf_1");

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("GET");
      expect(opts.path).toBe("/workflows/wf_1/download");
      expect(result).toEqual(definition);
    });
  });

  describe("goLive", () => {
    it("calls POST /workflows/:id/go-live with listing options", async () => {
      const listed = { ...MOCK_WORKFLOW, isListed: true, listedSlug: "balance-check" };
      mockRequest.mockResolvedValueOnce(listed);
      const options: GoLiveInput = {
        name: "Balance Check",
        workflowType: "read",
        priceUsdcPerCall: "0.01",
      };
      const result = await mod.goLive("wf_1", options);

      const opts = mockRequest.mock.calls[0]![0];
      expect(opts.method).toBe("POST");
      expect(opts.path).toBe("/workflows/wf_1/go-live");
      expect(opts.body).toEqual(options);
      expect(result.isListed).toBe(true);
    });
  });
});
