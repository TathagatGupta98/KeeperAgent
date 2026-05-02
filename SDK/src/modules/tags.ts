/**
 * Tags API module.
 */

import type { KeeperKitHttpClient } from "../client/http.js";
import type { Tag, CreateTagInput, UpdateTagInput } from "../models/common.js";

export class TagsModule {
  constructor(private readonly http: KeeperKitHttpClient) {}

  async list(): Promise<Tag[]> {
    return this.http.request<Tag[]>({
      method: "GET",
      path: "/tags",
    });
  }

  async create(input: CreateTagInput): Promise<Tag> {
    return this.http.request<Tag>({
      method: "POST",
      path: "/tags",
      body: input,
    });
  }

  async update(tagId: string, input: UpdateTagInput): Promise<Tag> {
    return this.http.request<Tag>({
      method: "PATCH",
      path: `/tags/${tagId}`,
      body: input,
    });
  }

  async delete(tagId: string): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/tags/${tagId}`,
    });
  }
}
