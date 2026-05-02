/**
 * Workflow Actions — LIST, GET, CREATE, UPDATE, DELETE, ENABLE, DISABLE workflows.
 */
import type { Action, IAgentRuntime, Memory, State, HandlerCallback, ActionExample } from '@elizaos/core';
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

async function extractId(runtime: IAgentRuntime, text: string, label: string) {
  return (await runtime.useModel(ModelType.OBJECT_SMALL, {
    prompt: `Extract the ${label} from this message:\n"${text}"\nReturn JSON: { "id": string }`,
  })) as { id?: string };
}

const LIST_WORKFLOWS: Action = {
  name: 'LIST_WORKFLOWS',
  similes: ['SHOW_WORKFLOWS', 'GET_ALL_WORKFLOWS', 'DISPLAY_WORKFLOWS', 'FETCH_WORKFLOWS'],
  description: 'List all KeeperHub workflows with names, IDs, and enabled status',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const workflows = await getService(runtime)!.client.listWorkflows();
      const summary = workflows.length === 0 ? 'No workflows found.' :
        workflows.map((w, i) => `${i + 1}. **${w.name}** (\`${w.id}\`) — ${w.enabled ? '✅ Enabled' : '❌ Disabled'}`).join('\n');
      const text = `Found ${workflows.length} workflow(s):\n\n${summary}`;
      if (callback) await callback({ text });
      return successResult(text, { workflows, count: workflows.length });
    } catch (err) { return catchErr('LIST_WORKFLOWS', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Show me all my KeeperHub workflows' } },
     { name: '{{name2}}', content: { text: 'Found 3 workflow(s):\n\n1. **Balance Monitor** (`wf_abc`) — ✅ Enabled' } }],
    [{ name: '{{name1}}', content: { text: 'List my workflows' } },
     { name: '{{name2}}', content: { text: 'Found 1 workflow(s):\n\n1. **Daily Report** (`wf_123`) — ✅ Enabled' } }],
  ] as ActionExample[][],
};

const GET_WORKFLOW: Action = {
  name: 'GET_WORKFLOW',
  similes: ['SHOW_WORKFLOW', 'WORKFLOW_DETAILS', 'DESCRIBE_WORKFLOW', 'INSPECT_WORKFLOW'],
  description: 'Get detailed information about a specific KeeperHub workflow by ID',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const p = await extractId(runtime, message.content.text as string, 'workflow ID');
      if (!p?.id) { if (callback) await callback({ text: 'Please provide a workflow ID.' }); return errorResult('Missing workflow ID'); }
      const w = await getService(runtime)!.client.getWorkflow(p.id);
      const text = `**${w.name}**\n- ID: \`${w.id}\`\n- Status: ${w.enabled ? '✅ Enabled' : '❌ Disabled'}\n- Visibility: ${w.visibility}\n- Nodes: ${w.nodes.length}\n- Edges: ${w.edges.length}\n- Description: ${w.description || 'None'}`;
      if (callback) await callback({ text });
      return successResult(text, { workflow: w });
    } catch (err) { return catchErr('GET_WORKFLOW', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Show me workflow wf_abc123' } },
     { name: '{{name2}}', content: { text: '**Balance Monitor**\n- ID: `wf_abc123`\n- Status: ✅ Enabled' } }],
    [{ name: '{{name1}}', content: { text: 'Get details of workflow wf_xyz789' } },
     { name: '{{name2}}', content: { text: '**Auto Swap**\n- ID: `wf_xyz789`\n- Status: ❌ Disabled' } }],
  ] as ActionExample[][],
};

const CREATE_WORKFLOW: Action = {
  name: 'CREATE_WORKFLOW',
  similes: ['NEW_WORKFLOW', 'BUILD_WORKFLOW', 'MAKE_WORKFLOW', 'ADD_WORKFLOW'],
  description: 'Create a new KeeperHub workflow from a natural language description',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      if (callback) await callback({ text: 'Analyzing your workflow requirements...' });
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract workflow parameters from:\n"${message.content.text}"\nReturn JSON: { "name": string, "description": string, "nodes": [{"id":string,"type":string,"position":{"x":number,"y":number},"data":{"type":string,"label":string}}], "edges": [{"id":string,"source":string,"target":string}], "enabled": boolean }`,
      })) as { name?: string; description?: string; nodes?: unknown[]; edges?: unknown[]; enabled?: boolean };
      if (!params?.name || !params?.nodes?.length) {
        if (callback) await callback({ text: 'Could not parse workflow. Please provide a name and description.' });
        return errorResult('Invalid workflow definition');
      }
      const w = await getService(runtime)!.client.createWorkflow({
        name: params.name, description: params.description,
        nodes: params.nodes as any, edges: (params.edges ?? []) as any, enabled: params.enabled ?? false,
      });
      const text = `✅ Workflow created!\n- Name: **${w.name}**\n- ID: \`${w.id}\`\n- Nodes: ${w.nodes.length}, Edges: ${w.edges.length}`;
      if (callback) await callback({ text });
      return successResult(text, { workflow: w });
    } catch (err) { return catchErr('CREATE_WORKFLOW', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Create a workflow called "Balance Monitor" that checks balance every 5 min' } },
     { name: '{{name2}}', content: { text: '✅ Workflow created!\n- Name: **Balance Monitor**\n- ID: `wf_new123`' } }],
    [{ name: '{{name1}}', content: { text: 'Build a "Price Alert" workflow for ETH price monitoring' } },
     { name: '{{name2}}', content: { text: '✅ Workflow created!\n- Name: **Price Alert**\n- ID: `wf_new456`' } }],
  ] as ActionExample[][],
};

const UPDATE_WORKFLOW: Action = {
  name: 'UPDATE_WORKFLOW',
  similes: ['EDIT_WORKFLOW', 'MODIFY_WORKFLOW', 'CHANGE_WORKFLOW'],
  description: 'Update an existing KeeperHub workflow — change name, description, or visibility',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const params = (await runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: `Extract update params from:\n"${message.content.text}"\nReturn JSON: { "workflowId": string, "updates": { "name"?: string, "description"?: string, "enabled"?: boolean } }`,
      })) as { workflowId?: string; updates?: Record<string, unknown> };
      if (!params?.workflowId) { if (callback) await callback({ text: 'Please provide a workflow ID.' }); return errorResult('Missing ID'); }
      const w = await getService(runtime)!.client.updateWorkflow(params.workflowId, params.updates ?? {});
      const text = `✅ Workflow updated: **${w.name}** (\`${w.id}\`)`;
      if (callback) await callback({ text });
      return successResult(text, { workflow: w });
    } catch (err) { return catchErr('UPDATE_WORKFLOW', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Rename workflow wf_abc123 to "Updated Monitor"' } },
     { name: '{{name2}}', content: { text: '✅ Workflow updated: **Updated Monitor** (`wf_abc123`)' } }],
    [{ name: '{{name1}}', content: { text: 'Update wf_xyz description to "Checks prices hourly"' } },
     { name: '{{name2}}', content: { text: '✅ Workflow updated: **Price Alert** (`wf_xyz`)' } }],
  ] as ActionExample[][],
};

const DELETE_WORKFLOW: Action = {
  name: 'DELETE_WORKFLOW',
  similes: ['REMOVE_WORKFLOW', 'DESTROY_WORKFLOW', 'TRASH_WORKFLOW'],
  description: 'Delete a KeeperHub workflow by its ID',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const p = await extractId(runtime, message.content.text as string, 'workflow ID to delete');
      if (!p?.id) { if (callback) await callback({ text: 'Please provide a workflow ID.' }); return errorResult('Missing ID'); }
      await getService(runtime)!.client.deleteWorkflow(p.id);
      const text = `🗑️ Workflow \`${p.id}\` deleted.`;
      if (callback) await callback({ text });
      return successResult(text, { deletedId: p.id });
    } catch (err) { return catchErr('DELETE_WORKFLOW', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Delete workflow wf_abc123' } },
     { name: '{{name2}}', content: { text: '🗑️ Workflow `wf_abc123` deleted.' } }],
    [{ name: '{{name1}}', content: { text: 'Remove workflow wf_old456' } },
     { name: '{{name2}}', content: { text: '🗑️ Workflow `wf_old456` deleted.' } }],
  ] as ActionExample[][],
};

const ENABLE_WORKFLOW: Action = {
  name: 'ENABLE_WORKFLOW',
  similes: ['ACTIVATE_WORKFLOW', 'TURN_ON_WORKFLOW', 'START_WORKFLOW'],
  description: 'Enable a KeeperHub workflow so it can be triggered',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const p = await extractId(runtime, message.content.text as string, 'workflow ID to enable');
      if (!p?.id) { if (callback) await callback({ text: 'Please provide a workflow ID.' }); return errorResult('Missing ID'); }
      const w = await getService(runtime)!.client.enableWorkflow(p.id);
      const text = `✅ **${w.name}** (\`${w.id}\`) is now enabled.`;
      if (callback) await callback({ text });
      return successResult(text, { workflow: w });
    } catch (err) { return catchErr('ENABLE_WORKFLOW', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Enable workflow wf_abc123' } },
     { name: '{{name2}}', content: { text: '✅ **Balance Monitor** (`wf_abc123`) is now enabled.' } }],
    [{ name: '{{name1}}', content: { text: 'Turn on workflow wf_xyz789' } },
     { name: '{{name2}}', content: { text: '✅ **Price Alert** (`wf_xyz789`) is now enabled.' } }],
  ] as ActionExample[][],
};

const DISABLE_WORKFLOW: Action = {
  name: 'DISABLE_WORKFLOW',
  similes: ['DEACTIVATE_WORKFLOW', 'TURN_OFF_WORKFLOW', 'PAUSE_WORKFLOW'],
  description: 'Disable a KeeperHub workflow to prevent it from triggering',
  validate: async (runtime: IAgentRuntime) => !!getService(runtime),
  handler: async (runtime, message, _state, _opts, callback) => {
    try {
      const p = await extractId(runtime, message.content.text as string, 'workflow ID to disable');
      if (!p?.id) { if (callback) await callback({ text: 'Please provide a workflow ID.' }); return errorResult('Missing ID'); }
      const w = await getService(runtime)!.client.disableWorkflow(p.id);
      const text = `⏸️ **${w.name}** (\`${w.id}\`) is now disabled.`;
      if (callback) await callback({ text });
      return successResult(text, { workflow: w });
    } catch (err) { return catchErr('DISABLE_WORKFLOW', err, callback); }
  },
  examples: [
    [{ name: '{{name1}}', content: { text: 'Disable workflow wf_abc123' } },
     { name: '{{name2}}', content: { text: '⏸️ **Balance Monitor** (`wf_abc123`) is now disabled.' } }],
    [{ name: '{{name1}}', content: { text: 'Turn off workflow wf_xyz789' } },
     { name: '{{name2}}', content: { text: '⏸️ **Auto Swap** (`wf_xyz789`) is now disabled.' } }],
  ] as ActionExample[][],
};

export const workflowActions: Action[] = [
  LIST_WORKFLOWS, GET_WORKFLOW, CREATE_WORKFLOW, UPDATE_WORKFLOW,
  DELETE_WORKFLOW, ENABLE_WORKFLOW, DISABLE_WORKFLOW,
];
