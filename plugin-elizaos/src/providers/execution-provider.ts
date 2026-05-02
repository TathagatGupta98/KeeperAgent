/**
 * Execution Provider — Injects recent execution status into agent context.
 */
import type { Provider, IAgentRuntime } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { KeeperKitService } from '../services/keeperkit-service.js';
import { KEEPERKIT_SERVICE_TYPE } from '../types/index.js';

export const executionProvider: Provider = {
  name: 'KEEPERHUB_RECENT_EXECUTIONS',
  description: 'Provides recent workflow execution statuses for context',
  dynamic: true,
  position: 'afterActions' as any,
  private: false,
  get: async (runtime: IAgentRuntime) => {
    try {
      const svc = runtime.getService<KeeperKitService>(KEEPERKIT_SERVICE_TYPE);
      if (!svc?.isAvailable) {
        return { text: 'KeeperHub executions: Not configured', data: undefined, values: {} };
      }

      // Get workflows first, then fetch recent executions for the first few
      const workflows = await svc.client.listWorkflows();
      if (workflows.length === 0) {
        return { text: 'KeeperHub executions: No workflows to check', data: { executions: [] }, values: {} };
      }

      const recentExecs: Array<{ workflowName: string; executionId: string; status: string; startedAt: string | null }> = [];

      // Check the first 5 workflows for recent executions
      for (const wf of workflows.slice(0, 5)) {
        try {
          const execs = await svc.client.listExecutions(wf.id, { limit: 3 });
          for (const exec of execs) {
            recentExecs.push({
              workflowName: wf.name,
              executionId: exec.id,
              status: exec.status,
              startedAt: exec.startedAt,
            });
          }
        } catch {
          // Skip workflows we can't fetch executions for
        }
      }

      if (recentExecs.length === 0) {
        return { text: 'KeeperHub executions: No recent executions', data: { executions: [] }, values: {} };
      }

      const summary = recentExecs.slice(0, 10).map(e =>
        `- ${e.workflowName}: ${e.status} (${e.startedAt || 'pending'})`
      ).join('\n');

      return {
        text: `KeeperHub recent executions (${recentExecs.length}):\n${summary}`,
        data: { executions: recentExecs },
        values: { executionCount: String(recentExecs.length) },
      };
    } catch (err) {
      logger.error('[KeeperKit] executionProvider error:', String(err));
      return { text: 'KeeperHub executions: Error fetching', data: undefined, values: {} };
    }
  },
};
