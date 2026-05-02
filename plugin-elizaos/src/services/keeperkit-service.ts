/**
 * KeeperKitService — Singleton service that manages the KeeperKit SDK client.
 *
 * Reads configuration from the ElizaOS runtime settings, instantiates the
 * KeeperKit client, and exposes it to all actions and providers.
 */

import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import { KeeperKit } from 'keeperkit';
import { ENV_KEYS, KEEPERKIT_SERVICE_TYPE } from '../types/index.js';

export class KeeperKitService extends Service {
  static serviceType = KEEPERKIT_SERVICE_TYPE;
  capabilityDescription =
    'Provides KeeperHub blockchain automation capabilities including workflow management, on-chain execution, and marketplace access';

  private _client: KeeperKit | null = null;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  /** The initialized KeeperKit client. Throws if not initialized. */
  get client(): KeeperKit {
    if (!this._client) {
      throw new Error(
        'KeeperKitService not initialized — ensure KEEPERHUB_API_KEY is set',
      );
    }
    return this._client;
  }

  /** Whether the service has a valid client ready. */
  get isAvailable(): boolean {
    return this._client !== null;
  }

  /**
   * Start the service — called automatically by ElizaOS during plugin init.
   */
  static async start(runtime: IAgentRuntime): Promise<KeeperKitService> {
    const service = new KeeperKitService(runtime);

    const apiKey = runtime.getSetting(ENV_KEYS.API_KEY);
    if (!apiKey) {
      logger.warn(
        '[KeeperKit] KEEPERHUB_API_KEY not configured — KeeperKit actions will be unavailable',
      );
      return service;
    }

    const rawBaseUrl = runtime.getSetting(ENV_KEYS.BASE_URL);
    const baseUrl = rawBaseUrl ? String(rawBaseUrl) : undefined;
    const rawTimeout = runtime.getSetting(ENV_KEYS.TIMEOUT);
    const timeout = rawTimeout ? Number(rawTimeout) : 30_000;
    const rawDirectExecutionApiKey = runtime.getSetting(
      ENV_KEYS.DIRECT_EXECUTION_API_KEY,
    );
    const directExecutionApiKey = rawDirectExecutionApiKey
      ? String(rawDirectExecutionApiKey)
      : undefined;

    service._client = new KeeperKit({
      apiKey: String(apiKey),
      directExecutionApiKey,
      baseUrl,
      timeout,
    });

    logger.info('[KeeperKit] KeeperKitService initialized successfully');
    return service;
  }

  /**
   * Stop the service — cleanup.
   */
  async stop(): Promise<void> {
    this._client = null;
    logger.info('[KeeperKit] KeeperKitService stopped');
  }
}
