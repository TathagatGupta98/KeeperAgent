/**
 * Action tests — validate and handler tests for key actions.
 */
import { describe, it, expect, vi } from 'vitest';
import { createMockRuntime, createMockService } from './test-utils.js';
import { workflowActions } from '../src/actions/workflow-actions.js';
import { executionActions } from '../src/actions/execution-actions.js';
import { directExecuteActions } from '../src/actions/direct-execute-actions.js';
import { marketplaceActions } from '../src/actions/marketplace-actions.js';
import { integrationActions } from '../src/actions/integration-actions.js';
import { chainActions } from '../src/actions/chain-actions.js';
import { schemaActions } from '../src/actions/schema-actions.js';

// Collect all actions
const allActions = [
  ...workflowActions,
  ...executionActions,
  ...directExecuteActions,
  ...marketplaceActions,
  ...integrationActions,
  ...chainActions,
  ...schemaActions,
];

describe('All actions have required fields', () => {
  for (const action of allActions) {
    it(`${action.name} has name, description, similes, examples, validate, handler`, () => {
      expect(action.name).toBeTruthy();
      expect(action.description).toBeTruthy();
      expect(action.similes).toBeDefined();
      expect(Array.isArray(action.similes)).toBe(true);
      expect(action.similes!.length).toBeGreaterThan(0);
      expect(action.examples).toBeDefined();
      expect(Array.isArray(action.examples)).toBe(true);
      expect(action.examples!.length).toBeGreaterThanOrEqual(2);
      expect(typeof action.validate).toBe('function');
      expect(typeof action.handler).toBe('function');
    });
  }
});

describe('Action validation', () => {
  it('should fail validation when service is unavailable', async () => {
    const runtime = createMockRuntime({});
    // No service registered — validation should fail
    for (const action of allActions) {
      const valid = await action.validate!(runtime, {} as any, {} as any);
      expect(valid).toBe(false);
    }
  });

  it('should pass validation when service is available', async () => {
    const runtime = createMockRuntime({ KEEPERHUB_API_KEY: 'kh_test' });
    const svc = createMockService();
    (runtime as any).getService = (type: string) => type === 'keeperkit' ? svc : undefined;

    for (const action of allActions) {
      const valid = await action.validate!(runtime, {} as any, {} as any);
      expect(valid).toBe(true);
    }
  });
});

describe('LIST_WORKFLOWS handler', () => {
  it('should return workflows list', async () => {
    const runtime = createMockRuntime({ KEEPERHUB_API_KEY: 'kh_test' });
    const svc = createMockService();
    (runtime as any).getService = (type: string) => type === 'keeperkit' ? svc : undefined;

    const callback = vi.fn();
    const result = await workflowActions[0]!.handler(
      runtime, { content: { text: 'list workflows' } } as any, undefined, undefined, callback,
    );

    expect(result).toBeDefined();
    expect((result as any).success).toBe(true);
    expect((result as any).data.count).toBe(1);
    expect(callback).toHaveBeenCalled();
  });
});

describe('LIST_CHAINS handler', () => {
  it('should return chains list', async () => {
    const runtime = createMockRuntime({ KEEPERHUB_API_KEY: 'kh_test' });
    const svc = createMockService();
    (runtime as any).getService = (type: string) => type === 'keeperkit' ? svc : undefined;

    const callback = vi.fn();
    const result = await chainActions[0]!.handler(
      runtime, { content: { text: 'list chains' } } as any, undefined, undefined, callback,
    );

    expect(result).toBeDefined();
    expect((result as any).success).toBe(true);
    expect((result as any).data.count).toBe(2);
  });
});

describe('GET_MCP_SCHEMAS handler', () => {
  it('should return schemas', async () => {
    const runtime = createMockRuntime({ KEEPERHUB_API_KEY: 'kh_test' });
    const svc = createMockService();
    (runtime as any).getService = (type: string) => type === 'keeperkit' ? svc : undefined;

    const callback = vi.fn();
    const result = await schemaActions[0]!.handler(
      runtime, { content: { text: 'show schemas' } } as any, undefined, undefined, callback,
    );

    expect(result).toBeDefined();
    expect((result as any).success).toBe(true);
    expect((result as any).data.schemas.actions.length).toBe(1);
  });
});

describe('Action count', () => {
  it('should have 20+ actions total', () => {
    expect(allActions.length).toBeGreaterThanOrEqual(20);
  });
});
