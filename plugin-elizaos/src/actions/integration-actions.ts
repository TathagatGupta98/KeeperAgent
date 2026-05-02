/**
 * Integration Actions — LIST, CREATE, DELETE integrations.
 */
import type { Action, IAgentRuntime, Memory, HandlerCallback, ActionExample } from '@elizaos/core';
import { ModelType, logger } from '@elizaos/core';
import { KeeperKitError } from 'keeperkit';
import type { CreateIntegrationInput } from 'keeperkit';
import { KeeperKitService } from '../services/keeperkit-service.js';
import { KEEPERKIT_SERVICE_TYPE, successResult, errorResult } from '../types/index.js';

function getService(runtime: IAgentRuntime): KeeperKitService | null {
  const svc = runtime.getService<KeeperKitService>(KEEPERKIT_SERVICE_TYPE);
  return svc?.isAvailable ? svc : null;
}

function catchErr(action: string, err: unknown, callback?: HandlerCallback) {
  const msg = err instanceof KeeperKitError ? err.message : String(err);
  logger.error(`[KeeperKit] ${action} error:`, msg);
  if (callback) void callback({ text: `Failed: ${msg}` });
  return errorResult(`Failed: ${msg}`, err);
}

const LIST_INTEGRATIONS: Action = {
  name: 'LIST_INTEGRATIONS',
  similes: ['SHOW_INTEGRATIONS', 'GET_INTEGRATIONS', 'VIEW_CONNECTIONS', 'LIST_CONNECTIONS'],
  description: 'List all KeeperHub integrations/connections (wallets, protocols, notification services)',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, _message, _state, _opts, callback) => {
    try {
      const integrations = await getService(runtime)!.client.listIntegrations();
      const summary = integrations.length === 0 ? 'No integrations configured.' :
        integrations.map((ig, i) => `${i + 1}. **${ig.name}** (\`${ig.id}\`) — Type: ${ig.type}`).join('\n');
      const text = `${integrations.length} integration(s):\n\n${summary}`;
      if (callback) await callback({ text });
      return successResult(text, { integrations, count: integrations.length });
    } catch (err) { return catchErr('LIST_INTEGRATIONS', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Show my integrations' } },
     { name: '{{name2}}', content: { text: '2 integration(s):\n\n1. **My Safe** (`int_1`) — Type: safe\n2. **Discord** (`int_2`) — Type: discord' } }],
    [{ name: '{{name1}}', content: { text: 'List all connections' } },
     { name: '{{name2}}', content: { text: '0 integration(s):\n\nNo integrations configured.' } }],
  ] as ActionExample[][],
};

const CREATE_INTEGRATION: Action = {
  name: 'CREATE_INTEGRATION',
  similes: ['ADD_INTEGRATION', 'NEW_INTEGRATION', 'CONNECT_SERVICE', 'ADD_CONNECTION'],
  description: 'Create a new KeeperHub integration/connection (wallet, protocol, or notification service)',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract integration params from:\n"${message.content.text}"\nReturn JSON: { "name": string, "type": string, "config": Record<string, unknown> }`,
      })) as Partial<CreateIntegrationInput>;
      if (!params?.name || !params?.type) {
        if (callback) await callback({ text: 'Please provide an integration name and type.' });
        return errorResult('Missing integration parameters');
      }
      const ig = await getService(runtime)!.client.createIntegration(params as CreateIntegrationInput);
      const text = `✅ Integration created: **${ig.name}** (\`${ig.id}\`) — Type: ${ig.type}`;
      if (callback) await callback({ text });
      return successResult(text, { integration: ig });
    } catch (err) { return catchErr('CREATE_INTEGRATION', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Create a Discord integration named "My Discord"' } },
     { name: '{{name2}}', content: { text: '✅ Integration created: **My Discord** (`int_new1`) — Type: discord' } }],
    [{ name: '{{name1}}', content: { text: 'Add a Safe wallet integration for my multisig' } },
     { name: '{{name2}}', content: { text: '✅ Integration created: **Safe Wallet** (`int_new2`) — Type: safe' } }],
  ] as ActionExample[][],
};

const DELETE_INTEGRATION: Action = {
  name: 'DELETE_INTEGRATION',
  similes: ['REMOVE_INTEGRATION', 'DISCONNECT_SERVICE', 'REMOVE_CONNECTION'],
  description: 'Delete a KeeperHub integration by ID',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract from:\n"${message.content.text}"\nReturn JSON: { "id": string }`,
      })) as { id?: string };
      if (!params?.id) { if (callback) await callback({ text: 'Please provide an integration ID.' }); return errorResult('Missing ID'); }
      await getService(runtime)!.client.deleteIntegration(params.id);
      const text = `🗑️ Integration \`${params.id}\` deleted.`;
      if (callback) await callback({ text });
      return successResult(text, { deletedId: params.id });
    } catch (err) { return catchErr('DELETE_INTEGRATION', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Delete integration int_abc123' } },
     { name: '{{name2}}', content: { text: '🗑️ Integration `int_abc123` deleted.' } }],
    [{ name: '{{name1}}', content: { text: 'Remove connection int_xyz789' } },
     { name: '{{name2}}', content: { text: '🗑️ Integration `int_xyz789` deleted.' } }],
  ] as ActionExample[][],
};

export const integrationActions: Action[] = [LIST_INTEGRATIONS, CREATE_INTEGRATION, DELETE_INTEGRATION];
