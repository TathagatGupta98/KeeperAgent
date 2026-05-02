/**
 * Chain Actions — LIST_CHAINS, GET_CONTRACT_ABI.
 */
import type { Action, IAgentRuntime, HandlerCallback, ActionExample } from '@elizaos/core';
import { ModelType, logger } from '@elizaos/core';
import { KeeperKitError } from 'keeperkit';
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

const LIST_CHAINS: Action = {
  name: 'LIST_CHAINS',
  similes: ['SHOW_CHAINS', 'GET_CHAINS', 'SUPPORTED_CHAINS', 'AVAILABLE_CHAINS'],
  description: 'List all blockchain networks supported by KeeperHub with chain IDs and testnet flags',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, _message, _state, _opts, callback) => {
    try {
      const chains = await getService(runtime)!.client.listChains();
      const summary = chains.map(c =>
        `- **${c.name}** — Chain ID: ${c.chainId}${c.testnet ? ' (testnet)' : ''}`
      ).join('\n');
      const text = `${chains.length} supported chain(s):\n\n${summary}`;
      if (callback) await callback({ text });
      return successResult(text, { chains, count: chains.length });
    } catch (err) { return catchErr('LIST_CHAINS', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'What chains does KeeperHub support?' } },
     { name: '{{name2}}', content: { text: '5 supported chain(s):\n\n- **Ethereum** — Chain ID: 1\n- **Base** — Chain ID: 8453' } }],
    [{ name: '{{name1}}', content: { text: 'List available blockchains' } },
     { name: '{{name2}}', content: { text: '3 supported chain(s):\n\n- **Sepolia** — Chain ID: 11155111 (testnet)' } }],
  ] as ActionExample[][],
};

const GET_CONTRACT_ABI: Action = {
  name: 'GET_CONTRACT_ABI',
  similes: ['FETCH_ABI', 'CONTRACT_ABI', 'GET_ABI', 'RESOLVE_ABI'],
  description: 'Fetch the ABI for a verified contract on a supported chain (supports proxy resolution)',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract from:\n"${message.content.text}"\nReturn JSON: { "chainId": number, "address": string }`,
      })) as { chainId?: number; address?: string };
      if (!params?.chainId || !params?.address) {
        if (callback) await callback({ text: 'Please provide a chain ID and contract address.' });
        return errorResult('Missing parameters');
      }
      const abi = await getService(runtime)!.client.chains.getAbi(params.chainId, params.address);
      const fns = Array.isArray(abi) ? abi.filter((e: any) => e.type === 'function').length : 0;
      const text = `📋 ABI for \`${params.address}\` on chain ${params.chainId}:\n- ${Array.isArray(abi) ? abi.length : 0} entries (${fns} functions)`;
      if (callback) await callback({ text });
      return successResult(text, { abi, chainId: params.chainId, address: params.address });
    } catch (err) { return catchErr('GET_CONTRACT_ABI', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Get the ABI for contract 0xABC on Ethereum (chain 1)' } },
     { name: '{{name2}}', content: { text: '📋 ABI for `0xABC` on chain 1:\n- 42 entries (15 functions)' } }],
    [{ name: '{{name1}}', content: { text: 'Fetch ABI for 0xDEF on Base chain 8453' } },
     { name: '{{name2}}', content: { text: '📋 ABI for `0xDEF` on chain 8453:\n- 28 entries (10 functions)' } }],
  ] as ActionExample[][],
};

export const chainActions: Action[] = [LIST_CHAINS, GET_CONTRACT_ABI];
