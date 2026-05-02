// SDK surface tested: createKeeperHubClient end-to-end workflow lifecycle
//
// Maps to claude_test.md Phase 3.1 "Workflow lifecycle integration test"
// adapted to SDK context (mocked fetch, no real server):
//   1. Create a workflow
//   2. Execute it
//   3. Poll for completion
//   4. Get execution logs
//   5. Delete the workflow

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

describe("Workflow lifecycle (mocked API)", () => {
  let client: KeeperHubClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = createKeeperHubClient({
      apiKey: "kh_test_lifecycle",
      baseUrl: "https://test.keeperhub.com/api",
      retry: { maxAttempts: 0 },
    });
  });

  it("completes a full create -> execute -> poll -> logs -> delete lifecycle", async () => {
    // Step 1: Create workflow
    const createdWorkflow = {
      id: "wf_lifecycle_1",
      name: "Lifecycle Test",
      description: null,
      userId: "user_1",
      organizationId: null,
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
    mockFetch.mockResolvedValueOnce(jsonResponse(createdWorkflow, 200));

    const workflow = await client.workflows.create({
      name: "Lifecycle Test",
      nodes: [],
      edges: [],
    });
    expect(workflow.id).toBe("wf_lifecycle_1");
    expect(workflow.name).toBe("Lifecycle Test");

    // Step 2: Execute the workflow
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ executionId: "exec_lifecycle_1" }, 200),
    );

    const execResult = await client.workflows.execute(workflow.id);
    expect(execResult.executionId).toBe("exec_lifecycle_1");

    // Step 3: Poll for completion - first poll returns running, second returns success
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({
          id: "exec_lifecycle_1",
          status: "running",
          totalSteps: 2,
          completedSteps: 1,
          currentNodeId: "node_2",
          currentNodeName: "Action",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "exec_lifecycle_1",
          status: "success",
          totalSteps: 2,
          completedSteps: 2,
          currentNodeId: null,
          currentNodeName: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "exec_lifecycle_1",
          workflowId: "wf_lifecycle_1",
          status: "success",
          input: {},
          output: { result: "done" },
          error: null,
          startedAt: "2026-01-01T00:00:00Z",
          completedAt: "2026-01-01T00:00:05Z",
          duration: 5000,
          totalSteps: 2,
          completedSteps: 2,
          currentNodeId: null,
          currentNodeName: null,
          lastSuccessfulNodeId: "node_2",
          lastSuccessfulNodeName: "Action",
          executionTrace: ["node_1", "node_2"],
          runId: "run_1",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:05Z",
        }),
      );

    const execution = await client.executions.waitForCompletion(
      "exec_lifecycle_1",
      { pollInterval: 10, timeout: 5000 },
    );
    expect(execution.status).toBe("success");
    expect(execution.completedSteps).toBe(2);

    // Step 4: Get execution logs
    const logs = [
      {
        id: "log_1",
        executionId: "exec_lifecycle_1",
        nodeId: "node_1",
        nodeName: "Trigger",
        nodeType: "trigger",
        status: "success",
        input: {},
        output: {},
        error: null,
        startedAt: "2026-01-01T00:00:00Z",
        completedAt: "2026-01-01T00:00:01Z",
        duration: 1000,
        iterationIndex: null,
        forEachNodeId: null,
      },
      {
        id: "log_2",
        executionId: "exec_lifecycle_1",
        nodeId: "node_2",
        nodeName: "Action",
        nodeType: "action",
        status: "success",
        input: {},
        output: { result: "done" },
        error: null,
        startedAt: "2026-01-01T00:00:01Z",
        completedAt: "2026-01-01T00:00:05Z",
        duration: 4000,
        iterationIndex: null,
        forEachNodeId: null,
      },
    ];
    mockFetch.mockResolvedValueOnce(jsonResponse(logs));

    const execLogs = await client.executions.getLogs("exec_lifecycle_1");
    expect(execLogs).toHaveLength(2);
    expect(execLogs[0]!.nodeId).toBe("node_1");
    expect(execLogs[0]!.status).toBe("success");
    expect(execLogs[1]!.nodeId).toBe("node_2");
    expect(execLogs[1]!.duration).toBe(4000);

    // Step 5: Delete the workflow
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await client.workflows.delete(workflow.id);

    // Verify all API calls were made
    expect(mockFetch).toHaveBeenCalledTimes(7);

    // Verify the URLs called in order
    const urls = mockFetch.mock.calls.map(
      (call: unknown[]) => new URL(call[0] as string).pathname,
    );
    expect(urls[0]).toBe("/api/workflows/create");                    // POST create
    expect(urls[1]).toBe("/api/workflow/wf_lifecycle_1/execute");      // POST execute
    expect(urls[2]).toBe("/api/workflows/executions/exec_lifecycle_1/status"); // GET status (poll 1)
    expect(urls[3]).toBe("/api/workflows/executions/exec_lifecycle_1/status"); // GET status (poll 2)
    expect(urls[4]).toBe("/api/workflows/executions/exec_lifecycle_1");        // GET full execution
    expect(urls[5]).toBe("/api/workflows/executions/exec_lifecycle_1/logs");   // GET logs
    expect(urls[6]).toBe("/api/workflows/wf_lifecycle_1");             // DELETE
  });

  it("handles failed execution in the lifecycle", async () => {
    // Create
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ id: "wf_fail", name: "Fail Test" }),
    );
    const workflow = await client.workflows.create({
      name: "Fail Test",
      nodes: [],
      edges: [],
    });

    // Execute
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ executionId: "exec_fail" }),
    );
    const { executionId } = await client.workflows.execute(workflow.id);

    // Poll -> error immediately
    mockFetch
      .mockResolvedValueOnce(
        jsonResponse({ id: "exec_fail", status: "error", totalSteps: 2, completedSteps: 1 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: "exec_fail",
          workflowId: "wf_fail",
          status: "error",
          error: "Node 2 failed: RPC timeout",
          output: null,
        }),
      );

    const execution = await client.executions.waitForCompletion(executionId, {
      pollInterval: 10,
    });
    expect(execution.status).toBe("error");
    expect(execution.error).toBe("Node 2 failed: RPC timeout");
  });
});
