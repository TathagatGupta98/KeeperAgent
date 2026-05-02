/**
 * Chains API module.
 */

import type { KeeperKitHttpClient } from "../client/http.js";
import type { Chain } from "../models/common.js";

export class ChainsModule {
  constructor(private readonly http: KeeperKitHttpClient) {}

  /**
   * List supported chains.
   * @param options.includeDisabled - If true, includes disabled chains.
   */
  async list(options?: { includeDisabled?: boolean }): Promise<Chain[]> {
    return this.http.request<Chain[]>({
      method: "GET",
      path: "/chains",
      query: {
        includeDisabled: options?.includeDisabled,
      },
    });
  }

  /**
   * Fetch the ABI for a contract on a specific chain.
   * Supports automatic proxy resolution (EIP-1967, EIP-1822, etc.)
   */
  async getAbi(chainId: number, address: string): Promise<unknown[]> {
    return this.http.request<unknown[]>({
      method: "GET",
      path: `/chains/${chainId}/abi/${address}`,
    });
  }
}
