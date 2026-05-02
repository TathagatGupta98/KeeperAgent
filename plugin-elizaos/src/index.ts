/**
 * @keeperhub/plugin-keeperkit
 *
 * ElizaOS plugin for KeeperHub blockchain automation.
 * Wraps the keeperkit SDK to expose all capabilities as ElizaOS-native
 * actions, providers, services, and evaluators.
 */

import type { Plugin } from '@elizaos/core';
import { KeeperKitService } from './services/keeperkit-service.js';

// Actions
import { workflowActions } from './actions/workflow-actions.js';
import { executionActions } from './actions/execution-actions.js';
import { directExecuteActions } from './actions/direct-execute-actions.js';
import { marketplaceActions } from './actions/marketplace-actions.js';
import { integrationActions } from './actions/integration-actions.js';
import { chainActions } from './actions/chain-actions.js';
import { schemaActions } from './actions/schema-actions.js';

// Providers
import { workflowProvider } from './providers/workflow-provider.js';
import { chainProvider } from './providers/chain-provider.js';
import { executionProvider } from './providers/execution-provider.js';

// Evaluators
import { executionEvaluator } from './evaluators/execution-evaluator.js';

export const keeperKitPlugin: Plugin = {
  name: '@keeperhub/plugin-keeperkit',
  description:
    'ElizaOS plugin for KeeperHub blockchain automation — manage workflows, execute on-chain operations, access the marketplace with x402 payments',

  config: {
    KEEPERHUB_API_KEY: process.env.KEEPERHUB_API_KEY,
    KEEPERHUB_BASE_URL: process.env.KEEPERHUB_BASE_URL,
    KEEPERHUB_TIMEOUT: process.env.KEEPERHUB_TIMEOUT,
  },

  init: async (_config, runtime) => {
    const apiKey = runtime.getSetting('KEEPERHUB_API_KEY');
    if (!apiKey) {
      console.warn(
        '[KeeperKit] KEEPERHUB_API_KEY not set — plugin will load but actions will be unavailable',
      );
    }
  },

  services: [KeeperKitService as any],

  actions: [
    ...workflowActions,
    ...executionActions,
    ...directExecuteActions,
    ...marketplaceActions,
    ...integrationActions,
    ...chainActions,
    ...schemaActions,
  ],

  providers: [workflowProvider, chainProvider, executionProvider],

  evaluators: [executionEvaluator],
};

export default keeperKitPlugin;

// Re-export service for named imports
export { KeeperKitService } from './services/keeperkit-service.js';
export { KEEPERKIT_SERVICE_TYPE, ENV_KEYS } from './types/index.js';
