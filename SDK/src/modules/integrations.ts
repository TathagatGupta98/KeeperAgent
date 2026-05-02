/**
 * Integrations API module.
 *
 * Covers: list, get, create, update, delete, test.
 */

import type { KeeperKitHttpClient } from "../client/http.js";
import type {
  Integration,
  CreateIntegrationInput,
  UpdateIntegrationInput,
} from "../models/integration.js";

export class IntegrationsModule {
  constructor(private readonly http: KeeperKitHttpClient) {}

  /**
   * List all integrations.
   */
  async list(): Promise<Integration[]> {
    return this.http.request<Integration[]>({
      method: "GET",
      path: "/integrations",
    });
  }

  /**
   * Get a single integration by ID.
   */
  async get(id: string): Promise<Integration> {
    return this.http.request<Integration>({
      method: "GET",
      path: `/integrations/${id}`,
    });
  }

  /**
   * Create a new integration.
   */
  async create(input: CreateIntegrationInput): Promise<Integration> {
    return this.http.request<Integration>({
      method: "POST",
      path: "/integrations",
      body: input,
    });
  }

  /**
   * Update an existing integration.
   */
  async update(
    id: string,
    input: UpdateIntegrationInput,
  ): Promise<Integration> {
    return this.http.request<Integration>({
      method: "PATCH",
      path: `/integrations/${id}`,
      body: input,
    });
  }

  /**
   * Delete an integration.
   */
  async delete(id: string): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/integrations/${id}`,
    });
  }

  /**
   * Test an integration's connectivity.
   */
  async test(
    id: string,
    overrides?: Record<string, unknown>,
  ): Promise<{ success: boolean }> {
    return this.http.request<{ success: boolean }>({
      method: "POST",
      path: `/integrations/${id}/test`,
      body: overrides,
    });
  }
}
