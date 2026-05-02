/**
 * Projects API module.
 */

import type { KeeperKitHttpClient } from "../client/http.js";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from "../models/common.js";

export class ProjectsModule {
  constructor(private readonly http: KeeperKitHttpClient) {}

  async list(): Promise<Project[]> {
    return this.http.request<Project[]>({
      method: "GET",
      path: "/projects",
    });
  }

  async create(input: CreateProjectInput): Promise<Project> {
    return this.http.request<Project>({
      method: "POST",
      path: "/projects",
      body: input,
    });
  }

  async update(projectId: string, input: UpdateProjectInput): Promise<Project> {
    return this.http.request<Project>({
      method: "PATCH",
      path: `/projects/${projectId}`,
      body: input,
    });
  }

  async delete(projectId: string): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/projects/${projectId}`,
    });
  }
}
