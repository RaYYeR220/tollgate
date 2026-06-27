import "server-only";
import { ARTICLES } from "./content";
import { createTollgate } from "@/sdk";

const REGISTRY = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;
const ONCHAIN =
  !!REGISTRY &&
  /^0x[0-9a-fA-F]{40}$/.test(REGISTRY) &&
  REGISTRY !== "0x0000000000000000000000000000000000000000";

// Explicit operator flag: open the gate so anyone can try the flow without
// spending real USDC (the public sandbox). The live config leaves it unset.
const DEMO = process.env.TOLLGATE_DEMO === "1";

/** Settlement parameters every gate quotes in its 402 response. */
export const SETTLEMENT = {
  network: "Arbitrum One",
  chainId: 42161,
  asset: "USDC",
  assetAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // native USDC on Arbitrum
  payTo:
    process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ??
    "0x0000000000000000000000000000000000000000",
} as const;

export type PaymentRequirements = {
  contentId: string;
  priceCents: number;
} & typeof SETTLEMENT;

export function paymentRequirements(contentId: string): PaymentRequirements {
  const article = ARTICLES.find((a) => a.contentId === contentId);
  return {
    contentId,
    priceCents: article?.priceCents ?? 0,
    ...SETTLEMENT,
  };
}

/**
 * The gate. Returns true only when `payer` is entitled to `contentId`.
 *
 * On-chain mode (once a registry is configured): read
 * `TollgateAccessRegistry.hasAccess(payer, contentId)` over RPC — entitlement is
 * settlement, and a client cannot forge it. Until the registry is deployed we
 * accept a settlement proof scoped to the same payer + content. The release path
 * downstream is byte-for-byte identical, so flipping to on-chain changes only
 * this function.
 */
/**
 * The gate. Entitlement is settlement: when the registry is configured we trust
 * ONLY the on-chain `hasAccess` read, keyed to a `payer` the server derived from
 * a verified Privy session (never a client-supplied header). `TOLLGATE_DEMO=1`
 * opens the gate as an explicit public sandbox; otherwise the gate fails closed.
 */
export async function verifyEntitlement(
  contentId: string,
  payer: string | null,
): Promise<boolean> {
  if (ONCHAIN && payer) {
    const tollgate = createTollgate({
      registry: REGISTRY as string,
      rpcUrl: process.env.ARBITRUM_RPC_URL,
    });
    if (await tollgate.hasAccess(payer, contentId)) return true;
  }
  // Fail closed: the only other thing that opens the gate is the explicit
  // public-sandbox flag — no client input, no NODE_ENV default-allow.
  return DEMO;
}
