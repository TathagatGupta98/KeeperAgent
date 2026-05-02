/**
 * Test utilities — mock runtime and service for plugin tests.
 */
import type { IAgentRuntime } from '@elizaos/core';
import { KeeperKitService } from '../src/services/keeperkit-service.js';

/**
 * Create a mock IAgentRuntime with configurable settings.
 */
export function createMockRuntime(settings: Record<string, string> = {}): IAgentRuntime {
  const services = new Map<string, unknown>();

  const runtime = {
    getSetting: (key: string) => settings[key] ?? undefined,
    getService: <T>(type: string) => services.get(type) as T | undefined,
    registerService: (type: string, service: unknown) => { services.set(type, service); },
    useModel: async (_type: unknown, opts: { prompt: string }) => {
      // Simple mock: return empty object; tests can override
      return {};
    },
    createMemory: async () => {},
    composeState: async () => ({}),
  } as unknown as IAgentRuntime;

  return runtime;
}

/**
 * Create a mock KeeperKit client with all methods stubbed.
 */
export function createMockClient() {
  return {
    listWorkflows: async () => [
      { id: 'wf_1', name: 'Test Workflow', enabled: true, visibility: 'private', nodes: [], edges: [], description: 'Test' },
    ],
    getWorkflow: async (id: string) => ({
      id, name: 'Test Workflow', enabled: true, visibility: 'private', nodes: [{ id: 'n1' }], edges: [], description: 'A test',
    }),
    createWorkflow: async (input: any) => ({ id: 'wf_new', ...input, nodes: input.nodes || [], edges: input.edges || [] }),
    updateWorkflow: async (id: string, updates: any) => ({ id, name: updates.name || 'Updated', enabled: true }),
    deleteWorkflow: async () => {},
    enableWorkflow: async (id: string) => ({ id, name: 'Test', enabled: true }),
    disableWorkflow: async (id: string) => ({ id, name: 'Test', enabled: false }),
    executeWorkflow: async () => ({ executionId: 'exec_1' }),
    getExecution: async (_wfId: string, execId: string) => ({
      id: execId, workflowId: 'wf_1', status: 'success', completedSteps: 3, totalSteps: 3, startedAt: '2024-01-01', duration: 1000,
    }),
    listExecutions: async () => [
      { id: 'exec_1', status: 'success', startedAt: '2024-01-01' },
    ],
    waitForExecution: async (_wfId: string, execId: string) => ({
      id: execId, status: 'success', completedSteps: 3, totalSteps: 3, duration: 1500,
    }),
    listChains: async () => [
      { id: 1, name: 'Ethereum', chainId: 1, testnet: false, enabled: true },
      { id: 2, name: 'Base', chainId: 8453, testnet: false, enabled: true },
    ],
    listIntegrations: async () => [
      { id: 'int_1', name: 'My Safe', type: 'safe' },
    ],
    createIntegration: async (input: any) => ({ id: 'int_new', ...input }),
    deleteIntegration: async () => {},
    executions: {
      getLogs: async () => [
        { id: 'log_1', nodeId: 'n1', nodeName: 'Check Balance', nodeType: 'action', status: 'success', error: null },
      ],
    },
    directExecute: {
      transfer: async () => ({ id: 'de_1', status: 'pending', chainId: 8453 }),
      contractCall: async () => ({ id: 'de_2', status: 'pending', chainId: 1 }),
      checkAndExecute: async () => ({ id: 'de_3', status: 'pending', chainId: 1 }),
      waitForCompletion: async (id: string) => ({ id, status: 'completed', transactionHash: '0xabc', chainId: 8453 }),
    },
    listedWorkflows: {
      search: async () => [
        { id: 'lw_1', name: 'Balance Check', slug: 'balance-check', priceUsdcPerCall: '0.01', category: 'defi' },
      ],
      call: async () => ({ data: { result: 'ok' }, responseHeaders: {}, payment: undefined }),
    },
    mcpSchemas: {
      get: async () => ({
        actions: [{ name: 'transfer', type: 'transfer' }],
        triggers: [{ name: 'schedule', type: 'schedule' }],
        chains: [{ name: 'Ethereum', chainId: 1 }],
      }),
    },
    chains: {
      getAbi: async () => [{ type: 'function', name: 'transfer' }, { type: 'function', name: 'approve' }],
    },
  };
}

/**
 * Create a mock KeeperKitService with a mock client.
 */
export function createMockService(runtime?: IAgentRuntime): KeeperKitService {
  const mockClient = createMockClient();
  const svc = {
    client: mockClient,
    isAvailable: true,
  } as unknown as KeeperKitService;
  return svc;
}
