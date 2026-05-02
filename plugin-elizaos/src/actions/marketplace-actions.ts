/**
 * Marketplace Actions — SEARCH_MARKETPLACE, CALL_LISTED_WORKFLOW (with x402 payment).
 */
import type { Action, IAgentRuntime, Memory, HandlerCallback, ActionExample } from '@elizaos/core';
import { ModelType, logger } from '@elizaos/core';
import { KeeperKitError } from 'keeperkit';
import type { PaymentChallenge } from 'keeperkit';
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

function formatChallenge(challenge: PaymentChallenge): string {
  const rails = challenge.rails.map(r =>
    `  - **${r.rail.toUpperCase()}**: ${r.amount} on chain ${r.chainId} → \`${r.recipientAddress}\``
  ).join('\n');
  return `💰 **Payment Required**\n- Workflow: \`${challenge.slug}\`\n- Price: **${challenge.priceUsdcPerCall} USDC** per call\n- Available payment rails:\n${rails}`;
}

const SEARCH_MARKETPLACE: Action = {
  name: 'SEARCH_MARKETPLACE',
  similes: ['BROWSE_MARKETPLACE', 'FIND_LISTED_WORKFLOWS', 'SEARCH_LISTED_WORKFLOWS', 'MARKETPLACE_SEARCH'],
  description: 'Search the KeeperHub marketplace for publicly listed workflows by query, category, or chain',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract search params from:\n"${message.content.text}"\nReturn JSON: { "query"?: string, "category"?: string, "chain"?: string }`,
      })) as { query?: string; category?: string; chain?: string };
      const results = await getService(runtime)!.client.listedWorkflows.search(params ?? {});
      if (results.length === 0) {
        const text = 'No marketplace workflows found matching your criteria.';
        if (callback) await callback({ text });
        return successResult(text, { results: [], count: 0 });
      }
      const summary = results.map((w, i) => {
        const price = w.priceUsdcPerCall ? `${w.priceUsdcPerCall} USDC` : 'Free';
        return `${i + 1}. **${w.name}** (slug: \`${w.slug}\`) — ${price}${w.category ? ` | ${w.category}` : ''}`;
      }).join('\n');
      const text = `Found ${results.length} marketplace workflow(s):\n\n${summary}`;
      if (callback) await callback({ text });
      return successResult(text, { results, count: results.length });
    } catch (err) { return catchErr('SEARCH_MARKETPLACE', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Search the marketplace for balance monitoring workflows' } },
     { name: '{{name2}}', content: { text: 'Found 2 marketplace workflow(s):\n\n1. **Balance Monitor** (slug: `balance-check`) — 0.01 USDC | defi' } }],
    [{ name: '{{name1}}', content: { text: 'Find DeFi workflows on Ethereum marketplace' } },
     { name: '{{name2}}', content: { text: 'Found 5 marketplace workflow(s):\n\n1. **Yield Optimizer** (slug: `yield-opt`) — Free' } }],
  ] as ActionExample[][],
};

const CALL_LISTED_WORKFLOW: Action = {
  name: 'CALL_LISTED_WORKFLOW',
  similes: ['INVOKE_LISTED_WORKFLOW', 'RUN_MARKETPLACE_WORKFLOW', 'EXECUTE_LISTED_WORKFLOW', 'USE_LISTED_WORKFLOW'],
  description: 'Call a listed workflow from the KeeperHub marketplace by slug. Handles x402 payment challenges — attempts auto-payment if a wallet service is available, otherwise returns the payment challenge details.',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract listed workflow call params from:\n"${message.content.text}"\nReturn JSON: { "slug": string, "input"?: Record<string, unknown> }`,
      })) as { slug?: string; input?: Record<string, unknown> };
      if (!params?.slug) {
        if (callback) await callback({ text: 'Please provide the workflow slug.' });
        return errorResult('Missing workflow slug');
      }

      if (callback) await callback({ text: `📡 Calling marketplace workflow \`${params.slug}\`...` });
      const svc = getService(runtime)!;
      const result = await svc.client.listedWorkflows.call(params.slug, params.input);

      // Handle 402 Payment Required
      if ('paymentRequired' in result) {
        const challenge = result.paymentRequired;

        // Attempt auto-payment via wallet service if available
        try {
          const walletService = runtime.getService('wallet') as {
            signPayment?: (p: { to: string; amount: string; token: string; chainId: number }) => Promise<string>;
          } | null;

          if (walletService?.signPayment) {
            const x402Rail = challenge.rails.find(r => r.rail === 'x402');
            if (x402Rail) {
              if (callback) await callback({ text: `💳 Auto-paying ${challenge.priceUsdcPerCall} USDC via x402...` });
              const paymentProof = await walletService.signPayment({
                to: x402Rail.recipientAddress,
                amount: x402Rail.amount,
                token: x402Rail.tokenAddress,
                chainId: x402Rail.chainId,
              });

              const paidResult = await svc.client.listedWorkflows.call(
                params.slug, params.input, { 'X-PAYMENT': paymentProof },
              );

              if (!('paymentRequired' in paidResult)) {
                const text = `✅ Workflow \`${params.slug}\` executed successfully. Paid ${challenge.priceUsdcPerCall} USDC via x402.`;
                if (callback) await callback({ text });
                return successResult(text, { result: paidResult.data, payment: { rail: 'x402', amount: challenge.priceUsdcPerCall } });
              }
            }
          }
        } catch (payErr) {
          logger.warn('[KeeperKit] Auto-payment failed:', String(payErr));
        }

        // Fallback: return payment challenge to user
        const text = formatChallenge(challenge);
        if (callback) await callback({ text });
        return successResult(text, { paymentChallenge: challenge }, { requiresPayment: 'true' });
      }

      // Successful call (free or already paid)
      const text = `✅ Marketplace workflow \`${params.slug}\` executed successfully.${result.payment ? ` (Paid via ${result.payment.rail})` : ''}`;
      if (callback) await callback({ text });
      return successResult(text, { result: result.data, payment: result.payment });
    } catch (err) { return catchErr('CALL_LISTED_WORKFLOW', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Call the balance-check workflow on the marketplace with address 0xABC' } },
     { name: '{{name2}}', content: { text: '✅ Marketplace workflow `balance-check` executed successfully.' } }],
    [{ name: '{{name1}}', content: { text: 'Use the yield-optimizer marketplace workflow' } },
     { name: '{{name2}}', content: { text: '💰 **Payment Required**\n- Price: **0.01 USDC** per call' } }],
  ] as ActionExample[][],
};

export const marketplaceActions: Action[] = [SEARCH_MARKETPLACE, CALL_LISTED_WORKFLOW];
