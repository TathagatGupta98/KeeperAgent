/**
 * Schema Actions — GET_MCP_SCHEMAS.
 */
import type { Action, IAgentRuntime, HandlerCallback, ActionExample } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { KeeperKitError } from 'keeperkit';
import { KeeperKitService } from '../services/keeperkit-service.js';
import { KEEPERKIT_SERVICE_TYPE, successResult, errorResult } from '../types/index.js';

function getService(runtime: IAgentRuntime): KeeperKitService | null {
  const svc = runtime.getService<KeeperKitService>(KEEPERKIT_SERVICE_TYPE);
  return svc?.isAvailable ? svc : null;
}

const GET_MCP_SCHEMAS: Action = {
  name: 'GET_MCP_SCHEMAS',
  similes: ['SHOW_SCHEMAS', 'LIST_SCHEMAS', 'GET_SCHEMAS', 'AVAILABLE_ACTIONS', 'AVAILABLE_TRIGGERS'],
  description: 'Fetch the complete MCP schema — all available actions, triggers, and chains from KeeperHub',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, _message, _state, _opts, callback) => {
    try {
      const schemas = await getService(runtime)!.client.mcpSchemas.get();
      const text = `📘 KeeperHub MCP Schemas:\n- **${schemas.actions.length}** available actions\n- **${schemas.triggers.length}** available triggers\n- **${schemas.chains.length}** supported chains\n\nTop actions: ${schemas.actions.slice(0, 5).map(a => a.name).join(', ')}${schemas.actions.length > 5 ? '...' : ''}`;
      if (callback) await callback({ text });
      return successResult(text, { schemas });
    } catch (err) {
      const msg = err instanceof KeeperKitError ? err.message : String(err);
      logger.error('[KeeperKit] GET_MCP_SCHEMAS error:', msg);
      if (callback) void callback({ text: `Failed: ${msg}` });
      return errorResult(`Failed: ${msg}`, err);
    }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'What actions and triggers are available on KeeperHub?' } },
     { name: '{{name2}}', content: { text: '📘 KeeperHub MCP Schemas:\n- **25** available actions\n- **8** available triggers\n- **5** supported chains' } }],
    [{ name: '{{name1}}', content: { text: 'Show me the MCP schemas' } },
     { name: '{{name2}}', content: { text: '📘 KeeperHub MCP Schemas:\n- **20** available actions\n- **6** available triggers' } }],
  ] as ActionExample[][],
};

export const schemaActions: Action[] = [GET_MCP_SCHEMAS];
