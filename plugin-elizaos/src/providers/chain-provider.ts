/**
 * Chain Provider — Injects supported chains into agent context.
 */
import type { Provider, IAgentRuntime } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { KeeperKitService } from '../services/keeperkit-service.js';
import { KEEPERKIT_SERVICE_TYPE } from '../types/index.js';

export const chainProvider: Provider = {
  name: 'KEEPERHUB_CHAINS',
  description: 'Provides the list of blockchain networks supported by KeeperHub',
  dynamic: false,
  position: 'afterActions' as any,
  private: false,
  get: async (runtime: IAgentRuntime) => {
    try {
      const svc = runtime.getService<KeeperKitService>(KEEPERKIT_SERVICE_TYPE);
      if (!svc?.isAvailable) {
        return { text: 'KeeperHub chains: Not configured', data: undefined, values: {} };
      }

      const chains = await svc.client.listChains();
      const summary = chains.map(c =>
        `- ${c.name} (Chain ID: ${c.chainId}${c.testnet ? ', testnet' : ''})`
      ).join('\n');

      return {
        text: `KeeperHub supported chains (${chains.length}):\n${summary}`,
        data: { chains: chains.map(c => ({ id: c.id, name: c.name, chainId: c.chainId, testnet: c.testnet })) },
        values: { chainCount: String(chains.length) },
      };
    } catch (err) {
      logger.error('[KeeperKit] chainProvider error:', String(err));
      return { text: 'KeeperHub chains: Error fetching chains', data: undefined, values: {} };
    }
  },
};
