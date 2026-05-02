/**
 * Workflow Provider — Injects active workflow summaries into agent context.
 */
import type { Provider, IAgentRuntime } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { KeeperKitService } from '../services/keeperkit-service.js';
import { KEEPERKIT_SERVICE_TYPE } from '../types/index.js';

export const workflowProvider: Provider = {
  name: 'KEEPERHUB_WORKFLOWS',
  description: 'Provides a summary of the user\'s active KeeperHub workflows for context',
  dynamic: true,
  position: 'afterActions' as any,
  private: false,
  get: async (runtime: IAgentRuntime) => {
    try {
      const svc = runtime.getService<KeeperKitService>(KEEPERKIT_SERVICE_TYPE);
      if (!svc?.isAvailable) {
        return { text: 'KeeperHub workflows: Not configured (KEEPERHUB_API_KEY missing)', data: undefined, values: {} };
      }

      const workflows = await svc.client.listWorkflows();
      if (workflows.length === 0) {
        return { text: 'KeeperHub workflows: No workflows found', data: { workflows: [] }, values: { workflowCount: '0' } };
      }

      const summary = workflows.map(w =>
        `- ${w.name} (ID: ${w.id}, ${w.enabled ? 'enabled' : 'disabled'})`
      ).join('\n');

      return {
        text: `KeeperHub workflows (${workflows.length}):\n${summary}`,
        data: { workflows: workflows.map(w => ({ id: w.id, name: w.name, enabled: w.enabled })) },
        values: { workflowCount: String(workflows.length) },
      };
    } catch (err) {
      logger.error('[KeeperKit] workflowProvider error:', String(err));
      return { text: 'KeeperHub workflows: Error fetching workflows', data: undefined, values: {} };
    }
  },
};
