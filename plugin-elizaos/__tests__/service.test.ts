/**
 * KeeperKitService tests.
 */
import { describe, it, expect, vi } from 'vitest';
import { KeeperKitService } from '../src/services/keeperkit-service.js';
import { createMockRuntime } from './test-utils.js';

describe('KeeperKitService', () => {
  it('should initialize with API key', async () => {
    const runtime = createMockRuntime({ KEEPERHUB_API_KEY: 'kh_test_123' });
    const service = await KeeperKitService.start(runtime);
    expect(service.isAvailable).toBe(true);
    expect(() => service.client).not.toThrow();
  });

  it('should handle missing API key gracefully', async () => {
    const runtime = createMockRuntime({});
    const service = await KeeperKitService.start(runtime);
    expect(service.isAvailable).toBe(false);
    expect(() => service.client).toThrow('KeeperKitService not initialized');
  });

  it('should accept custom baseUrl and timeout', async () => {
    const runtime = createMockRuntime({
      KEEPERHUB_API_KEY: 'kh_test_123',
      KEEPERHUB_BASE_URL: 'https://custom.api.com',
      KEEPERHUB_TIMEOUT: '15000',
    });
    const service = await KeeperKitService.start(runtime);
    expect(service.isAvailable).toBe(true);
  });

  it('should stop and clear client', async () => {
    const runtime = createMockRuntime({ KEEPERHUB_API_KEY: 'kh_test_123' });
    const service = await KeeperKitService.start(runtime);
    expect(service.isAvailable).toBe(true);
    await service.stop();
    expect(service.isAvailable).toBe(false);
  });

  it('should have correct serviceType', () => {
    expect(KeeperKitService.serviceType).toBe('keeperkit');
  });
});
