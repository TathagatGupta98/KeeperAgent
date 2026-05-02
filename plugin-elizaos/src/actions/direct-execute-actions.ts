/**
 * Direct Execute Actions — TRANSFER_TOKEN, CONTRACT_CALL, CHECK_AND_EXECUTE.
 */
import type { Action, IAgentRuntime, Memory, HandlerCallback, ActionExample } from '@elizaos/core';
import { ModelType, logger } from '@elizaos/core';
import { KeeperKitError } from 'keeperkit';
import type { TransferInput, ContractCallInput, CheckAndExecuteInput } from 'keeperkit';
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

const TRANSFER_TOKEN: Action = {
  name: 'TRANSFER_TOKEN',
  similes: ['SEND_TOKEN', 'TRANSFER_CRYPTO', 'SEND_CRYPTO', 'TOKEN_TRANSFER'],
  description: 'Execute a native or ERC-20 token transfer via KeeperHub direct execution',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract transfer parameters from:\n"${message.content.text}"\nReturn JSON: { "chainId": number, "to": string, "amount": string, "tokenAddress"?: string }`,
      })) as Partial<TransferInput>;
      if (!params?.chainId || !params?.to || !params?.amount) {
        if (callback) await callback({ text: 'Please provide chainId, recipient address, and amount.' });
        return errorResult('Missing transfer parameters');
      }
      if (callback) await callback({ text: `💸 Initiating transfer of ${params.amount} to \`${params.to}\` on chain ${params.chainId}...` });
      const svc = getService(runtime)!;
      const exec = await svc.client.directExecute.transfer(params as TransferInput);
      if (callback) await callback({ text: `⏳ Transfer submitted (ID: \`${exec.id}\`). Waiting for completion...` });
      const result = await svc.client.directExecute.waitForCompletion(exec.id, { timeout: 120_000 });
      const emoji = result.status === 'completed' ? '✅' : '❌';
      const text = `${emoji} Transfer ${result.status}\n- ID: \`${result.id}\`\n- Tx: \`${result.transactionHash || 'N/A'}\`\n- Chain: ${result.chainId}`;
      if (callback) await callback({ text });
      return successResult(text, { execution: result });
    } catch (err) { return catchErr('TRANSFER_TOKEN', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Transfer 1000000 USDC to 0xRecipient on Base (chain 8453)' } },
     { name: '{{name2}}', content: { text: '✅ Transfer completed\n- Tx: `0xabc...`\n- Chain: 8453' } }],
    [{ name: '{{name1}}', content: { text: 'Send 0.5 ETH to 0xAddr on Sepolia chain 11155111' } },
     { name: '{{name2}}', content: { text: '✅ Transfer completed\n- Tx: `0xdef...`\n- Chain: 11155111' } }],
  ] as ActionExample[][],
};

const CONTRACT_CALL: Action = {
  name: 'CONTRACT_CALL',
  similes: ['CALL_CONTRACT', 'SMART_CONTRACT_CALL', 'INVOKE_CONTRACT', 'EXECUTE_CONTRACT'],
  description: 'Execute a smart contract function call via KeeperHub direct execution',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract contract call parameters from:\n"${message.content.text}"\nReturn JSON: { "chainId": number, "contractAddress": string, "functionName": string, "abi": object[], "args"?: unknown[], "value"?: string }`,
      })) as Partial<ContractCallInput>;
      if (!params?.chainId || !params?.contractAddress || !params?.functionName || !params?.abi) {
        if (callback) await callback({ text: 'Please provide chainId, contractAddress, functionName, and ABI.' });
        return errorResult('Missing contract call parameters');
      }
      if (callback) await callback({ text: `📝 Calling \`${params.functionName}\` on \`${params.contractAddress}\`...` });
      const svc = getService(runtime)!;
      const exec = await svc.client.directExecute.contractCall(params as ContractCallInput);
      if (callback) await callback({ text: `⏳ Contract call submitted (ID: \`${exec.id}\`). Waiting...` });
      const result = await svc.client.directExecute.waitForCompletion(exec.id, { timeout: 120_000 });
      const emoji = result.status === 'completed' ? '✅' : '❌';
      const text = `${emoji} Contract call ${result.status}\n- ID: \`${result.id}\`\n- Tx: \`${result.transactionHash || 'N/A'}\`\n- Function: ${params.functionName}`;
      if (callback) await callback({ text });
      return successResult(text, { execution: result });
    } catch (err) { return catchErr('CONTRACT_CALL', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Call approve on 0xToken for 0xSpender with 1e18 on chain 1' } },
     { name: '{{name2}}', content: { text: '✅ Contract call completed\n- Function: approve\n- Tx: `0xabc...`' } }],
    [{ name: '{{name1}}', content: { text: 'Execute transfer function on contract 0xDEF on Base' } },
     { name: '{{name2}}', content: { text: '✅ Contract call completed\n- Function: transfer\n- Tx: `0xghi...`' } }],
  ] as ActionExample[][],
};

const CHECK_AND_EXECUTE: Action = {
  name: 'CHECK_AND_EXECUTE',
  similes: ['CONDITIONAL_EXECUTE', 'CHECK_THEN_EXECUTE', 'CONDITIONAL_CONTRACT_CALL'],
  description: 'Read a value on-chain, check a condition, and execute a write call if met — via KeeperHub',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract check-and-execute parameters from:\n"${message.content.text}"\nReturn JSON: { "chainId": number, "check": { "contractAddress": string, "functionName": string, "abi": object[], "args"?: unknown[] }, "condition": { "operator": "eq"|"neq"|"gt"|"gte"|"lt"|"lte", "value": string }, "execute": { "contractAddress": string, "functionName": string, "abi": object[], "args"?: unknown[], "value"?: string } }`,
      })) as Partial<CheckAndExecuteInput>;
      if (!params?.chainId || !params?.check || !params?.condition || !params?.execute) {
        if (callback) await callback({ text: 'Please provide chainId, check, condition, and execute parameters.' });
        return errorResult('Missing check-and-execute parameters');
      }
      if (callback) await callback({ text: `🔍 Checking condition on chain ${params.chainId}...` });
      const svc = getService(runtime)!;
      const exec = await svc.client.directExecute.checkAndExecute(params as CheckAndExecuteInput);
      if (callback) await callback({ text: `⏳ Check-and-execute submitted (ID: \`${exec.id}\`). Waiting...` });
      const result = await svc.client.directExecute.waitForCompletion(exec.id, { timeout: 120_000 });
      const emoji = result.status === 'completed' ? '✅' : '❌';
      const text = `${emoji} Check-and-execute ${result.status}\n- ID: \`${result.id}\`\n- Tx: \`${result.transactionHash || 'N/A'}\``;
      if (callback) await callback({ text });
      return successResult(text, { execution: result });
    } catch (err) { return catchErr('CHECK_AND_EXECUTE', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Check if balance > 1 ETH on contract 0xTok then transfer 0.5 to 0xRecip on chain 1' } },
     { name: '{{name2}}', content: { text: '✅ Check-and-execute completed\n- Tx: `0xabc...`' } }],
    [{ name: '{{name1}}', content: { text: 'If allowance >= 100 on 0xToken, execute swap on 0xRouter chain 8453' } },
     { name: '{{name2}}', content: { text: '✅ Check-and-execute completed\n- Tx: `0xdef...`' } }],
  ] as ActionExample[][],
};

export const directExecuteActions: Action[] = [TRANSFER_TOKEN, CONTRACT_CALL, CHECK_AND_EXECUTE];
