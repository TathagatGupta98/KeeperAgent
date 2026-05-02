/**
 * Execution Actions — EXECUTE, GET, LIST, GET_LOGS, WAIT for workflow executions.
 */
import type { Action, IAgentRuntime, Memory, HandlerCallback, ActionExample } from '@elizaos/core';
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

const EXECUTE_WORKFLOW: Action = {
  name: 'EXECUTE_WORKFLOW',
  similes: ['RUN_WORKFLOW', 'TRIGGER_WORKFLOW', 'FIRE_WORKFLOW', 'LAUNCH_WORKFLOW'],
  description: 'Trigger a manual execution of a KeeperHub workflow and return the execution ID',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract from:\n"${message.content.text}"\nReturn JSON: { "workflowId": string }`,
      })) as { workflowId?: string };
      if (!params?.workflowId) { if (callback) await callback({ text: 'Please provide a workflow ID to execute.' }); return errorResult('Missing workflow ID'); }
      const result = await getService(runtime)!.client.executeWorkflow(params.workflowId);
      const text = `🚀 Workflow \`${params.workflowId}\` triggered!\n- Execution ID: \`${result.executionId}\`\n\nUse "wait for execution ${result.executionId}" to monitor progress.`;
      if (callback) await callback({ text });
      return successResult(text, { executionId: result.executionId, workflowId: params.workflowId });
    } catch (err) { return catchErr('EXECUTE_WORKFLOW', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Execute workflow wf_abc123' } },
     { name: '{{name2}}', content: { text: '🚀 Workflow `wf_abc123` triggered!\n- Execution ID: `exec_001`' } }],
    [{ name: '{{name1}}', content: { text: 'Run my balance monitor workflow wf_def456' } },
     { name: '{{name2}}', content: { text: '🚀 Workflow `wf_def456` triggered!\n- Execution ID: `exec_002`' } }],
  ] as ActionExample[][],
};

const GET_EXECUTION: Action = {
  name: 'GET_EXECUTION',
  similes: ['SHOW_EXECUTION', 'EXECUTION_STATUS', 'EXECUTION_DETAILS', 'CHECK_EXECUTION'],
  description: 'Get details and status of a specific workflow execution',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract from:\n"${message.content.text}"\nReturn JSON: { "executionId": string, "workflowId": string }`,
      })) as { executionId?: string; workflowId?: string };
      if (!params?.executionId) { if (callback) await callback({ text: 'Please provide an execution ID.' }); return errorResult('Missing execution ID'); }
      const exec = await getService(runtime)!.client.getExecution(params.workflowId ?? '', params.executionId);
      const text = `Execution \`${exec.id}\`\n- Status: **${exec.status}**\n- Workflow: \`${exec.workflowId}\`\n- Progress: ${exec.completedSteps ?? 0}/${exec.totalSteps ?? '?'} steps\n- Started: ${exec.startedAt || 'pending'}\n- Duration: ${exec.duration ? `${exec.duration}ms` : 'N/A'}`;
      if (callback) await callback({ text });
      return successResult(text, { execution: exec });
    } catch (err) { return catchErr('GET_EXECUTION', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Check execution exec_001 for workflow wf_abc' } },
     { name: '{{name2}}', content: { text: 'Execution `exec_001`\n- Status: **success**\n- Progress: 5/5 steps' } }],
    [{ name: '{{name1}}', content: { text: 'What is the status of execution exec_002?' } },
     { name: '{{name2}}', content: { text: 'Execution `exec_002`\n- Status: **running**\n- Progress: 2/4 steps' } }],
  ] as ActionExample[][],
};

const LIST_EXECUTIONS: Action = {
  name: 'LIST_EXECUTIONS',
  similes: ['SHOW_EXECUTIONS', 'EXECUTION_HISTORY', 'GET_EXECUTIONS'],
  description: 'List execution history for a specific workflow',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract from:\n"${message.content.text}"\nReturn JSON: { "workflowId": string }`,
      })) as { workflowId?: string };
      if (!params?.workflowId) { if (callback) await callback({ text: 'Please provide a workflow ID.' }); return errorResult('Missing workflow ID'); }
      const execs = await getService(runtime)!.client.listExecutions(params.workflowId);
      const summary = execs.length === 0 ? 'No executions found.' :
        execs.slice(0, 10).map((e, i) => `${i + 1}. \`${e.id}\` — **${e.status}** (${e.startedAt || 'pending'})`).join('\n');
      const text = `${execs.length} execution(s) for workflow \`${params.workflowId}\`:\n\n${summary}`;
      if (callback) await callback({ text });
      return successResult(text, { executions: execs, count: execs.length });
    } catch (err) { return catchErr('LIST_EXECUTIONS', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Show execution history for workflow wf_abc123' } },
     { name: '{{name2}}', content: { text: '3 execution(s) for workflow `wf_abc123`:\n\n1. `exec_001` — **success**' } }],
    [{ name: '{{name1}}', content: { text: 'List executions of wf_def456' } },
     { name: '{{name2}}', content: { text: '0 execution(s) for workflow `wf_def456`:\n\nNo executions found.' } }],
  ] as ActionExample[][],
};

const GET_EXECUTION_LOGS: Action = {
  name: 'GET_EXECUTION_LOGS',
  similes: ['SHOW_EXECUTION_LOGS', 'EXECUTION_NODE_LOGS', 'NODE_RESULTS'],
  description: 'Get per-node execution logs for a specific execution',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract from:\n"${message.content.text}"\nReturn JSON: { "executionId": string }`,
      })) as { executionId?: string };
      if (!params?.executionId) { if (callback) await callback({ text: 'Please provide an execution ID.' }); return errorResult('Missing execution ID'); }
      const logs = await getService(runtime)!.client.executions.getLogs(params.executionId);
      const summary = logs.length === 0 ? 'No logs found.' :
        logs.map((l, i) => `${i + 1}. **${l.nodeName || l.nodeId}** (${l.nodeType || 'unknown'}) — ${l.status}${l.error ? ` ⚠️ Error: ${String(l.error)}` : ''}`).join('\n');
      const text = `Execution logs for \`${params.executionId}\` (${logs.length} nodes):\n\n${summary}`;
      if (callback) await callback({ text });
      return successResult(text, { logs });
    } catch (err) { return catchErr('GET_EXECUTION_LOGS', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Show logs for execution exec_001' } },
     { name: '{{name2}}', content: { text: 'Execution logs for `exec_001` (3 nodes):\n\n1. **Check Balance** (action) — success' } }],
    [{ name: '{{name1}}', content: { text: 'Get node results for exec_002' } },
     { name: '{{name2}}', content: { text: 'Execution logs for `exec_002` (2 nodes):\n\n1. **Trigger** (trigger) — success' } }],
  ] as ActionExample[][],
};

const WAIT_EXECUTION: Action = {
  name: 'WAIT_EXECUTION',
  similes: ['WAIT_FOR_EXECUTION', 'POLL_EXECUTION', 'MONITOR_EXECUTION', 'TRACK_EXECUTION'],
  description: 'Poll a workflow execution until it completes and report the final status',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract from:\n"${message.content.text}"\nReturn JSON: { "executionId": string, "workflowId": string }`,
      })) as { executionId?: string; workflowId?: string };
      if (!params?.executionId) { if (callback) await callback({ text: 'Please provide an execution ID.' }); return errorResult('Missing execution ID'); }
      if (callback) await callback({ text: `⏳ Waiting for execution \`${params.executionId}\` to complete...` });
      const exec = await getService(runtime)!.client.waitForExecution(
        params.workflowId ?? '', params.executionId, { timeoutMs: 120_000, pollIntervalMs: 3000 },
      );
      const emoji = exec.status === 'success' ? '✅' : exec.status === 'error' ? '❌' : '⚪';
      const text = `${emoji} Execution \`${exec.id}\` completed with status: **${exec.status}**\n- Duration: ${exec.duration ? `${exec.duration}ms` : 'N/A'}\n- Steps: ${exec.completedSteps ?? 0}/${exec.totalSteps ?? '?'}`;
      if (callback) await callback({ text });
      return successResult(text, { execution: exec });
    } catch (err) { return catchErr('WAIT_EXECUTION', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Wait for execution exec_001 of workflow wf_abc' } },
     { name: '{{name2}}', content: { text: '✅ Execution `exec_001` completed with status: **success**\n- Duration: 4500ms' } }],
    [{ name: '{{name1}}', content: { text: 'Monitor execution exec_002 until done' } },
     { name: '{{name2}}', content: { text: '❌ Execution `exec_002` completed with status: **error**' } }],
  ] as ActionExample[][],
};

export const executionActions: Action[] = [
  EXECUTE_WORKFLOW, GET_EXECUTION, LIST_EXECUTIONS, GET_EXECUTION_LOGS, WAIT_EXECUTION,
];
