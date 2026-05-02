/**
 * MCP Schemas API module.
 *
 * Provides action/trigger/chain schema discovery via /api/mcp/schemas.
 */

import type { KeeperKitHttpClient } from "../client/http.js";
import type { McpSchemaResponse } from "../models/common.js";

export class McpSchemasModule {
  constructor(private readonly http: KeeperKitHttpClient) {}

  /**
   * Fetch the complete action, trigger, and chain schema metadata.
   */
  async get(): Promise<McpSchemaResponse> {
    return this.http.request<McpSchemaResponse>({
      method: "GET",
      path: "/mcp/schemas",
    });
  }
}
