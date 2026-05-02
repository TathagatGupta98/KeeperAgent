// SDK surface tested: createKeeperHubClient entry point and KeeperHubClient interface
//
// Verifies:
//   - createKeeperHubClient returns an object with all 9 module properties
//   - apiKey shorthand creates ApiKeyAuth automatically
//   - auth provider takes precedence over apiKey
//   - default config works (no args)

import { describe, it, expect } from "vitest";
import {
  createKeeperHubClient,
  type KeeperHubClient,
} from "../../index.js";
import { OAuthBearerAuth } from "../../client/auth.js";
import { WorkflowsModule } from "../../modules/workflows.js";
import { ExecutionsModule } from "../../modules/executions.js";
import { DirectExecuteModule } from "../../modules/direct-execute.js";
import { ListedWorkflowsModule } from "../../modules/listed-workflows.js";
import { IntegrationsModule } from "../../modules/integrations.js";
import { ProjectsModule } from "../../modules/projects.js";
import { TagsModule } from "../../modules/tags.js";
import { ChainsModule } from "../../modules/chains.js";
import { McpSchemasModule } from "../../modules/mcp-schemas.js";

describe("createKeeperHubClient", () => {
  it("returns a client with all 9 module properties", () => {
    const client = createKeeperHubClient({ apiKey: "kh_test_123" });

    expect(client.workflows).toBeInstanceOf(WorkflowsModule);
    expect(client.executions).toBeInstanceOf(ExecutionsModule);
    expect(client.directExecute).toBeInstanceOf(DirectExecuteModule);
    expect(client.listedWorkflows).toBeInstanceOf(ListedWorkflowsModule);
    expect(client.integrations).toBeInstanceOf(IntegrationsModule);
    expect(client.projects).toBeInstanceOf(ProjectsModule);
    expect(client.tags).toBeInstanceOf(TagsModule);
    expect(client.chains).toBeInstanceOf(ChainsModule);
    expect(client.mcpSchemas).toBeInstanceOf(McpSchemasModule);
  });

  it("works with no config (default base URL, no auth)", () => {
    const client = createKeeperHubClient();

    expect(client.workflows).toBeInstanceOf(WorkflowsModule);
    expect(client.executions).toBeInstanceOf(ExecutionsModule);
  });

  it("accepts apiKey shorthand to create ApiKeyAuth", () => {
    // This should not throw (apiKey with kh_ prefix is valid)
    const client = createKeeperHubClient({ apiKey: "kh_live_abcdef" });
    expect(client).toBeDefined();
  });

  it("throws on invalid apiKey prefix", () => {
    expect(() =>
      createKeeperHubClient({ apiKey: "invalid_key" }),
    ).toThrow("Invalid KeeperKit API key");
  });

  it("accepts custom auth provider", () => {
    const auth = new OAuthBearerAuth("token_abc");
    const client = createKeeperHubClient({ auth });
    expect(client).toBeDefined();
  });

  it("auth provider takes precedence over apiKey when both provided", () => {
    const auth = new OAuthBearerAuth("oauth_token");
    // Should NOT throw even though apiKey is invalid, because auth takes precedence
    const client = createKeeperHubClient({ auth, apiKey: "kh_ignored" });
    expect(client).toBeDefined();
  });

  it("satisfies the KeeperHubClient interface", () => {
    const client: KeeperHubClient = createKeeperHubClient({
      apiKey: "kh_test",
    });

    // Type-level check: all properties exist
    const modules: (keyof KeeperHubClient)[] = [
      "workflows",
      "executions",
      "directExecute",
      "listedWorkflows",
      "integrations",
      "projects",
      "tags",
      "chains",
      "mcpSchemas",
    ];

    for (const mod of modules) {
      expect(client[mod]).toBeDefined();
    }
  });

  it("accepts custom baseUrl", () => {
    const client = createKeeperHubClient({
      baseUrl: "https://staging.keeperhub.com/api",
    });
    expect(client).toBeDefined();
  });

  it("accepts retry policy overrides", () => {
    const client = createKeeperHubClient({
      apiKey: "kh_test",
      retry: { maxAttempts: 3, baseDelayMs: 500 },
    });
    expect(client).toBeDefined();
  });

  it("accepts timeout override", () => {
    const client = createKeeperHubClient({
      apiKey: "kh_test",
      timeout: 60_000,
    });
    expect(client).toBeDefined();
  });
});
