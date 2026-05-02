// SDK surface tested: IntegrationsModule, ProjectsModule, TagsModule, ChainsModule, McpSchemasModule
//
// These are simpler CRUD modules. Grouped into one test file for efficiency
// since each follows the same http.request delegation pattern.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { KeeperKitHttpClient } from "../../client/http.js";
import { IntegrationsModule } from "../../modules/integrations.js";
import { ProjectsModule } from "../../modules/projects.js";
import { TagsModule } from "../../modules/tags.js";
import { ChainsModule } from "../../modules/chains.js";
import { McpSchemasModule } from "../../modules/mcp-schemas.js";

const mockRequest = vi.fn();
const httpStub = { request: mockRequest } as unknown as KeeperKitHttpClient;

describe("IntegrationsModule", () => {
  let mod: IntegrationsModule;

  beforeEach(() => {
    vi.clearAllMocks();
    mod = new IntegrationsModule(httpStub);
  });

  it("list calls GET /integrations", async () => {
    mockRequest.mockResolvedValueOnce([]);
    await mod.list();
    expect(mockRequest.mock.calls[0]![0].method).toBe("GET");
    expect(mockRequest.mock.calls[0]![0].path).toBe("/integrations");
  });

  it("get calls GET /integrations/:id", async () => {
    mockRequest.mockResolvedValueOnce({ id: "int_1" });
    await mod.get("int_1");
    expect(mockRequest.mock.calls[0]![0].path).toBe("/integrations/int_1");
  });

  it("create calls POST /integrations with body", async () => {
    mockRequest.mockResolvedValueOnce({ id: "int_1" });
    await mod.create({ name: "Discord", type: "discord", config: {} });
    const opts = mockRequest.mock.calls[0]![0];
    expect(opts.method).toBe("POST");
    expect(opts.body.name).toBe("Discord");
  });

  it("update calls PATCH /integrations/:id", async () => {
    mockRequest.mockResolvedValueOnce({ id: "int_1" });
    await mod.update("int_1", { name: "Updated" });
    const opts = mockRequest.mock.calls[0]![0];
    expect(opts.method).toBe("PATCH");
    expect(opts.path).toBe("/integrations/int_1");
  });

  it("delete calls DELETE /integrations/:id", async () => {
    mockRequest.mockResolvedValueOnce(undefined);
    await mod.delete("int_1");
    expect(mockRequest.mock.calls[0]![0].method).toBe("DELETE");
  });

  it("test calls POST /integrations/:id/test", async () => {
    mockRequest.mockResolvedValueOnce({ success: true });
    const result = await mod.test("int_1", { overrideKey: "val" });
    const opts = mockRequest.mock.calls[0]![0];
    expect(opts.method).toBe("POST");
    expect(opts.path).toBe("/integrations/int_1/test");
    expect(opts.body).toEqual({ overrideKey: "val" });
    expect(result.success).toBe(true);
  });

  it("test sends undefined body when no overrides", async () => {
    mockRequest.mockResolvedValueOnce({ success: true });
    await mod.test("int_1");
    expect(mockRequest.mock.calls[0]![0].body).toBeUndefined();
  });
});

describe("ProjectsModule", () => {
  let mod: ProjectsModule;

  beforeEach(() => {
    vi.clearAllMocks();
    mod = new ProjectsModule(httpStub);
  });

  it("list calls GET /projects", async () => {
    mockRequest.mockResolvedValueOnce([]);
    await mod.list();
    expect(mockRequest.mock.calls[0]![0].path).toBe("/projects");
  });

  it("create calls POST /projects with name", async () => {
    mockRequest.mockResolvedValueOnce({ id: "proj_1" });
    await mod.create({ name: "My Project" });
    const opts = mockRequest.mock.calls[0]![0];
    expect(opts.method).toBe("POST");
    expect(opts.body.name).toBe("My Project");
  });

  it("update calls PATCH /projects/:id", async () => {
    mockRequest.mockResolvedValueOnce({ id: "proj_1" });
    await mod.update("proj_1", { name: "Renamed" });
    expect(mockRequest.mock.calls[0]![0].path).toBe("/projects/proj_1");
    expect(mockRequest.mock.calls[0]![0].method).toBe("PATCH");
  });

  it("delete calls DELETE /projects/:id", async () => {
    mockRequest.mockResolvedValueOnce(undefined);
    await mod.delete("proj_1");
    expect(mockRequest.mock.calls[0]![0].method).toBe("DELETE");
    expect(mockRequest.mock.calls[0]![0].path).toBe("/projects/proj_1");
  });
});

describe("TagsModule", () => {
  let mod: TagsModule;

  beforeEach(() => {
    vi.clearAllMocks();
    mod = new TagsModule(httpStub);
  });

  it("list calls GET /tags", async () => {
    mockRequest.mockResolvedValueOnce([]);
    await mod.list();
    expect(mockRequest.mock.calls[0]![0].path).toBe("/tags");
  });

  it("create calls POST /tags with name and color", async () => {
    mockRequest.mockResolvedValueOnce({ id: "tag_1" });
    await mod.create({ name: "DeFi", color: "#3B82F6" });
    const opts = mockRequest.mock.calls[0]![0];
    expect(opts.method).toBe("POST");
    expect(opts.body.color).toBe("#3B82F6");
  });

  it("update calls PATCH /tags/:id", async () => {
    mockRequest.mockResolvedValueOnce({ id: "tag_1" });
    await mod.update("tag_1", { name: "Updated" });
    expect(mockRequest.mock.calls[0]![0].method).toBe("PATCH");
    expect(mockRequest.mock.calls[0]![0].path).toBe("/tags/tag_1");
  });

  it("delete calls DELETE /tags/:id", async () => {
    mockRequest.mockResolvedValueOnce(undefined);
    await mod.delete("tag_1");
    expect(mockRequest.mock.calls[0]![0].method).toBe("DELETE");
  });
});

describe("ChainsModule", () => {
  let mod: ChainsModule;

  beforeEach(() => {
    vi.clearAllMocks();
    mod = new ChainsModule(httpStub);
  });

  it("list calls GET /chains with no query by default", async () => {
    mockRequest.mockResolvedValueOnce([]);
    await mod.list();
    const opts = mockRequest.mock.calls[0]![0];
    expect(opts.path).toBe("/chains");
    expect(opts.query.includeDisabled).toBeUndefined();
  });

  it("list passes includeDisabled query param when set", async () => {
    mockRequest.mockResolvedValueOnce([]);
    await mod.list({ includeDisabled: true });
    expect(mockRequest.mock.calls[0]![0].query.includeDisabled).toBe(true);
  });

  it("getAbi calls GET /chains/:chainId/abi/:address", async () => {
    mockRequest.mockResolvedValueOnce([{ type: "function", name: "balanceOf" }]);
    const result = await mod.getAbi(1, "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    const opts = mockRequest.mock.calls[0]![0];
    expect(opts.method).toBe("GET");
    expect(opts.path).toBe(
      "/chains/1/abi/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    );
    expect(result).toHaveLength(1);
  });
});

describe("McpSchemasModule", () => {
  let mod: McpSchemasModule;

  beforeEach(() => {
    vi.clearAllMocks();
    mod = new McpSchemasModule(httpStub);
  });

  it("get calls GET /mcp/schemas and returns typed response", async () => {
    const mockResponse = {
      actions: [
        {
          type: "web3:getBalance",
          name: "Get Balance",
          description: "Check native balance",
          pluginId: "web3",
          category: "web3",
          configFields: [],
          outputFields: [],
          requiresCredential: false,
        },
      ],
      triggers: [
        {
          type: "schedule",
          name: "Scheduled",
          description: "Cron-based trigger",
          configFields: [],
        },
      ],
      chains: [
        {
          id: 1,
          name: "Ethereum",
          chainId: 1,
          enabled: true,
          testnet: false,
        },
      ],
    };
    mockRequest.mockResolvedValueOnce(mockResponse);
    const result = await mod.get();

    const opts = mockRequest.mock.calls[0]![0];
    expect(opts.method).toBe("GET");
    expect(opts.path).toBe("/mcp/schemas");
    expect(result.actions).toHaveLength(1);
    expect(result.triggers).toHaveLength(1);
    expect(result.chains).toHaveLength(1);
  });
});
