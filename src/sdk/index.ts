/**
 * @tollgate/sdk — drop a paywall onto anything you publish.
 *
 * Dependency-free. The only network call is a raw `eth_call` to read
 * `TollgateAccessRegistry.hasAccess(reader, contentId)` on Arbitrum, so a server
 * can decide whether to release gated content. No ethers/viem, no backend.
 */

export const ARBITRUM_ONE = 42161;
export const ARBITRUM_USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
export const DEFAULT_RPC = "https://arb1.arbitrum.io/rpc";

/** selector of hasAccess(address,bytes32) */
const HAS_ACCESS = "0x7d294e62";

export type PaymentRequirements = {
  contentId: string;
  priceCents: number;
  asset: "USDC";
  assetAddress: string;
  network: string;
  chainId: number;
  payTo: string;
};

export type TollgateConfig = {
  /** deployed TollgateAccessRegistry address */
  registry: string;
  /** Arbitrum RPC (defaults to the public endpoint) */
  rpcUrl?: string;
  /** where unlock payments settle (defaults to the registry) */
  payTo?: string;
};

function pad32(hex: string): string {
  return hex.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

export function createTollgate(cfg: TollgateConfig) {
  const rpcUrl = cfg.rpcUrl ?? DEFAULT_RPC;

  return {
    /** The 402 quote a gate returns: pay this, on this network, to this address. */
    requirements(contentId: string, priceCents: number): PaymentRequirements {
      return {
        contentId,
        priceCents,
        asset: "USDC",
        assetAddress: ARBITRUM_USDC,
        network: "Arbitrum One",
        chainId: ARBITRUM_ONE,
        payTo: cfg.payTo ?? cfg.registry,
      };
    },

    /**
     * Reads `hasAccess(reader, contentId)` straight from the registry over RPC.
     * Entitlement is settlement — a client cannot forge it.
     */
    async hasAccess(reader: string, contentId: string): Promise<boolean> {
      const data = HAS_ACCESS + pad32(reader) + pad32(contentId);
      try {
        const res = await fetch(rpcUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_call",
            params: [{ to: cfg.registry, data }, "latest"],
          }),
        });
        const json = (await res.json()) as { result?: string; error?: unknown };
        if (!json.result || json.error) return false;
        // any non-zero byte in the returned word means true
        return /[1-9a-f]/.test(json.result.slice(2));
      } catch {
        return false;
      }
    },
  };
}

export type Tollgate = ReturnType<typeof createTollgate>;
