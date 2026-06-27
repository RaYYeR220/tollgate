/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  usePrivy,
  useWallets,
  useSign7702Authorization,
  useSignMessage,
} from "@privy-io/react-auth";
import {
  UniversalAccount,
  CHAIN_ID,
  SUPPORTED_TOKEN_TYPE,
} from "@particle-network/universal-account-sdk";
import { Signature } from "ethers";
import { encodeFunctionData } from "viem";

/**
 * The real wallet: Privy embedded wallet (email/social, no seed) running a
 * Particle Universal Account in EIP-7702 mode. `purchase` builds a batched
 * approve + purchase, routes USDC cross-chain to Arbitrum, and settles in one
 * signature. The access layer calls this when available and falls back to its
 * local simulation when it isn't — so the demo never breaks.
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID;
const CLIENT_KEY = process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY;
const APP_UUID = process.env.NEXT_PUBLIC_PARTICLE_APP_ID;
const REGISTRY = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as
  | `0x${string}`
  | undefined;
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";

const APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const PURCHASE_ABI = [
  {
    name: "purchase",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "contentId", type: "bytes32" }],
    outputs: [],
  },
] as const;

export type RealPurchase = {
  txHash: `0x${string}`;
  sourceChain: string;
  /** Particle activity id → universalx.app cross-chain settlement view */
  activityId?: string;
};

export type RealWallet = {
  /** Privy + Particle env present — the real path is wired. */
  available: boolean;
  ready: boolean;
  authenticated: boolean;
  email?: string;
  address?: `0x${string}`;
  uaReady: boolean;
  balanceCents?: number;
  login: () => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  refreshBalance: () => Promise<void>;
  purchase: (
    contentId: `0x${string}`,
    priceCents: number,
    onPhase?: (p: string) => void,
  ) => Promise<RealPurchase>;
};

const RealWalletContext = createContext<RealWallet | null>(null);
export const useRealWallet = () => useContext(RealWalletContext);

export function RealWalletBridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } =
    usePrivy();
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const { signMessage } = useSignMessage();

  // Only ever drive the UA from the Privy embedded wallet — never an injected
  // extension (MetaMask/Rabby) that happens to be connected to localhost.
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  const address = embedded?.address as `0x${string}` | undefined;
  const email =
    (user?.email?.address as string | undefined) ??
    (user?.google?.email as string | undefined);

  const uaRef = useRef<any>(null);
  const [uaReady, setUaReady] = useState(false);
  const [balanceCents, setBalanceCents] = useState<number | undefined>();

  // Initialise the Universal Account once we have an owner address.
  useEffect(() => {
    if (!address || !PROJECT_ID || !CLIENT_KEY || !APP_UUID) {
      uaRef.current = null;
      setUaReady(false);
      return;
    }
    try {
      uaRef.current = new UniversalAccount({
        projectId: PROJECT_ID,
        projectClientKey: CLIENT_KEY,
        projectAppUuid: APP_UUID,
        smartAccountOptions: { useEIP7702: true, ownerAddress: address },
        tradeConfig: { slippageBps: 100, universalGas: true },
      } as any);
      setUaReady(true);
      console.log("[tollgate] UA ready — owner (fund THIS on Base/Polygon):", address);
      void uaRef.current
        .getSmartAccountOptions?.()
        .then((o: any) => console.log("[tollgate] UA smart-account options:", o))
        .catch(() => {});
    } catch (e) {
      console.error("[tollgate] UA init failed", e);
      uaRef.current = null;
      setUaReady(false);
    }
  }, [address]);

  const refreshBalance = useCallback(async () => {
    const ua = uaRef.current;
    if (!ua) return;
    try {
      const assets: any = await ua.getPrimaryAssets();
      console.log("[tollgate] primaryAssets raw:", assets);
      const usd = Number(assets?.totalAmountInUSD ?? assets?.totalAmountInUsd ?? 0);
      console.log("[tollgate] parsed balance USD:", usd);
      setBalanceCents(Math.round(usd * 100));
    } catch (e) {
      console.warn("[tollgate] balance fetch failed", e);
    }
  }, []);

  useEffect(() => {
    if (uaReady) void refreshBalance();
  }, [uaReady, refreshBalance]);

  const purchase = useCallback(
    async (
      contentId: `0x${string}`,
      priceCents: number,
      onPhase?: (p: string) => void,
    ): Promise<RealPurchase> => {
      const ua = uaRef.current;
      if (!ua) throw new Error("ua-not-ready");
      if (!address) throw new Error("no-address");
      if (!REGISTRY) throw new Error("no-registry");

      onPhase?.("preparing");
      const priceAtomic = BigInt(priceCents) * BigInt(10000); // USDC has 6 decimals
      const approveData = encodeFunctionData({
        abi: APPROVE_ABI,
        functionName: "approve",
        args: [REGISTRY, priceAtomic],
      });
      const purchaseData = encodeFunctionData({
        abi: PURCHASE_ABI,
        functionName: "purchase",
        args: [contentId],
      });

      // Batched approve + purchase, settled on Arbitrum; the UA sources USDC
      // from whatever chain the reader holds it on.
      const tx: any = await ua.createUniversalTransaction({
        chainId: CHAIN_ID.ARBITRUM_MAINNET_ONE,
        expectTokens: [
          { type: SUPPORTED_TOKEN_TYPE.USDC, amount: (priceCents / 100).toString() },
        ],
        transactions: [
          { to: USDC, data: approveData, value: "0x0" },
          { to: REGISTRY, data: purchaseData, value: "0x0" },
        ],
      } as any);

      onPhase?.("routing");
      // Sign one EIP-7702 authorization per un-delegated userOp (first tx per chain).
      const userOps: any[] = tx.userOps ?? tx.transaction?.userOps ?? [];
      const authorizations: any[] = [];
      for (const op of userOps) {
        if (op?.eip7702Auth && !op?.eip7702Delegated) {
          const auth: any = await signAuthorization({
            contractAddress: op.eip7702Auth.address,
            chainId: Number(op.eip7702Auth.chainId),
            nonce: op.eip7702Auth.nonce,
          } as any);
          const sig = Signature.from({
            r: auth.r,
            s: auth.s,
            v: auth.v ?? BigInt(auth.yParity),
            yParity: auth.yParity,
          });
          authorizations.push({
            userOpHash: op.userOpHash,
            signature: sig.serialized,
          });
        }
      }

      const { signature } = await signMessage({ message: tx.rootHash });
      onPhase?.("settling");
      const result: any = await ua.sendTransaction(
        tx,
        signature,
        authorizations.length ? authorizations : undefined,
      );
      onPhase?.("verifying");

      console.log("[tollgate] sendTransaction result:", result);
      const activityId = (result?.transactionId ?? result?.id ?? "") as string;
      const onchain = (result?.transactionHash ??
        result?.txHash ??
        result?.hash) as string | undefined;
      const txHash = (onchain ?? activityId ?? "0x") as `0x${string}`;

      void refreshBalance();
      return { txHash, sourceChain: "your balance", activityId };
    },
    [address, signAuthorization, signMessage, refreshBalance],
  );

  const value = useMemo<RealWallet>(
    () => ({
      available: Boolean(PROJECT_ID && CLIENT_KEY && APP_UUID),
      ready,
      authenticated,
      email,
      address,
      uaReady,
      balanceCents,
      login,
      logout,
      getAccessToken,
      refreshBalance,
      purchase,
    }),
    [
      ready,
      authenticated,
      email,
      address,
      uaReady,
      balanceCents,
      login,
      logout,
      getAccessToken,
      refreshBalance,
      purchase,
    ],
  );

  return (
    <RealWalletContext.Provider value={value}>
      {children}
    </RealWalletContext.Provider>
  );
}
