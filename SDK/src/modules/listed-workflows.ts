/**
 * Listed Workflows API module.
 *
 * Covers: search listed workflows and invoke by slug with payment challenge parsing.
 */

import type { KeeperKitHttpClient } from "../client/http.js";
import type { ListedWorkflowView } from "../models/workflow.js";
import type {
  PaymentChallenge,
  PaymentHeaders,
  ListedWorkflowCallResult,
} from "../models/payment.js";

export class ListedWorkflowsModule {
  constructor(private readonly http: KeeperKitHttpClient) {}

  /**
   * Search listed workflows on the marketplace.
   */
  async search(options?: {
    query?: string;
    category?: string;
    chain?: string;
  }): Promise<ListedWorkflowView[]> {
    return this.http.request<ListedWorkflowView[]>({
      method: "GET",
      path: "/mcp/workflows",
      query: {
        q: options?.query,
        category: options?.category,
        chain: options?.chain,
      },
    });
  }

  /**
   * Call a listed workflow by slug.
   *
   * If the workflow requires payment and no payment headers are provided,
   * the 402 response is parsed into a typed `PaymentChallenge` and returned
   * inside a `PaymentRequiredResult` instead of throwing.
   *
   * @returns Either the call result or a payment challenge if payment is required.
   */
  async call<T = unknown>(
    slug: string,
    input?: Record<string, unknown>,
    payment?: PaymentHeaders,
  ): Promise<ListedWorkflowCallResult<T> | { paymentRequired: PaymentChallenge }> {
    const headers: Record<string, string> = {};
    if (payment) {
      for (const [key, value] of Object.entries(payment)) {
        if (value !== undefined) {
          headers[key] = value;
        }
      }
    }

    const response = await this.http.raw("POST", `/mcp/workflows/${slug}/call`, {
      body: input ?? {},
      headers,
    });

    // Parse 402 Payment Required into structured challenge
    if (response.status === 402) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = {};
      }
      const challenge = this.parsePaymentChallenge(slug, body);
      return { paymentRequired: challenge };
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const { mapResponseToError } = await import("../client/errors.js");
      throw mapResponseToError(response.status, body);
    }

    const data = (await response.json()) as T;

    // Preserve payment receipt headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    return {
      data,
      responseHeaders,
      payment: this.extractPaymentMetadata(responseHeaders),
    };
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private parsePaymentChallenge(
    slug: string,
    body: unknown,
  ): PaymentChallenge {
    const b = body as Record<string, unknown>;
    return {
      slug,
      priceUsdcPerCall: String(b.priceUsdcPerCall ?? b.price ?? "0"),
      rails: Array.isArray(b.rails)
        ? (b.rails as Array<Record<string, unknown>>).map((r) => ({
            rail: String(r.rail) as "x402" | "mpp",
            chainId: Number(r.chainId),
            tokenAddress: String(r.tokenAddress ?? ""),
            recipientAddress: String(r.recipientAddress ?? ""),
            amount: String(r.amount ?? "0"),
          }))
        : [],
    };
  }

  private extractPaymentMetadata(
    headers: Record<string, string>,
  ): ListedWorkflowCallResult["payment"] {
    const xPaymentReceipt = headers["x-payment-receipt"];
    const mppReceipt = headers["x-mpp-payment-receipt"];

    if (xPaymentReceipt) {
      return {
        rail: "x402",
        receipt: { "x-payment-receipt": xPaymentReceipt },
      };
    }
    if (mppReceipt) {
      return {
        rail: "mpp",
        receipt: { "x-mpp-payment-receipt": mppReceipt },
      };
    }
    return undefined;
  }
}
