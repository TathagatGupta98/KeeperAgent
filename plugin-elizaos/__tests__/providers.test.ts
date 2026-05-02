/**
 * Provider tests — verify provider data format.
 */
import { describe, it, expect } from 'vitest';
import { createMockRuntime, createMockService } from './test-utils.js';
import { workflowProvider } from '../src/providers/workflow-provider.js';
import { chainProvider } from '../src/providers/chain-provider.js';
import { executionProvider } from '../src/providers/execution-provider.js';

function setupRuntime() {
  const runtime = createMockRuntime({ KEEPERHUB_API_KEY: 'kh_test' });
  const svc = createMockService();
  (runtime as any).getService = (type: string) => type === 'keeperkit' ? svc : undefined;
  return runtime;
}

describe('workflowProvider', () => {
  it('should return workflow data', async () => {
    const runtime = setupRuntime();
    const result = await workflowProvider.get(runtime, {} as any, {} as any);
    expect(result.text).toContain('KeeperHub workflows');
    expect(result.data).toBeDefined();
    expect((result.data as any).workflows.length).toBeGreaterThan(0);
  });

  it('should handle unavailable service', async () => {
    const runtime = createMockRuntime({});
    const result = await workflowProvider.get(runtime, {} as any, {} as any);
    expect(result.text).toContain('Not configured');
  });
});

describe('chainProvider', () => {
  it('should return chain data', async () => {
    const runtime = setupRuntime();
    const result = await chainProvider.get(runtime, {} as any, {} as any);
    expect(result.text).toContain('supported chains');
    expect(result.data).toBeDefined();
    expect((result.data as any).chains.length).toBe(2);
  });
});

describe('executionProvider', () => {
  it('should return execution data', async () => {
    const runtime = setupRuntime();
    const result = await executionProvider.get(runtime, {} as any, {} as any);
    expect(result.text).toContain('execution');
    expect(result.data).toBeDefined();
  });
});

describe('Provider properties', () => {
  it('workflowProvider is dynamic', () => {
    expect(workflowProvider.dynamic).toBe(true);
  });

  it('chainProvider is static', () => {
    expect(chainProvider.dynamic).toBe(false);
  });

  it('executionProvider is dynamic', () => {
    expect(executionProvider.dynamic).toBe(true);
  });
});
