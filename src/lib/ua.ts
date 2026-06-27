/**
 * Universal Account settlement — the shared seam.
 *
 * Every value move in Tollgate (unlock, tip, publish, withdraw) runs through one
 * simulated settlement so the whole product feels consistent today. When the
 * Particle UA SDK is wired, `simulateSettle` is replaced by a real
 * `createUniversalTransaction` → `sendTransaction`; callers and UI are unchanged.
 */

export const SOURCE_CHAINS = ["Base", "Polygon", "Optimism", "BNB Chain"] as const;

export type SettlePhase = "preparing" | "routing" | "settling" | "verifying" | "done";

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function randomTxHash(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

export function pickSourceChain(): string {
  const bytes = new Uint8Array(1);
  crypto.getRandomValues(bytes);
  return SOURCE_CHAINS[bytes[0] % SOURCE_CHAINS.length];
}

export type SettleResult = { txHash: `0x${string}`; sourceChain: string };

/**
 * Drive a settlement with phase callbacks. The defaults are tuned to feel like a
 * real cross-chain settle (route liquidity → land on Arbitrum → confirm) without
 * dragging. `routeMs`/`settleMs` let callers shorten quiet actions.
 */
export async function simulateSettle(
  onPhase?: (p: SettlePhase) => void,
  opts: { routeMs?: number; settleMs?: number } = {},
): Promise<SettleResult> {
  const { routeMs = 900, settleMs = 750 } = opts;
  onPhase?.("preparing");
  await wait(280);
  onPhase?.("routing");
  await wait(routeMs);
  onPhase?.("settling");
  await wait(settleMs);
  onPhase?.("verifying");
  await wait(360);
  onPhase?.("done");
  return { txHash: randomTxHash(), sourceChain: pickSourceChain() };
}
