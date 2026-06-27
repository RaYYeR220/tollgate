"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRealWallet } from "./realwallet";

/**
 * Tollgate's account + settlement layer.
 *
 * It runs in two modes behind one interface. When a real wallet is wired
 * (Privy embedded wallet + Particle Universal Account), `unlock` performs a real
 * cross-chain purchase on Arbitrum. Otherwise — or if a real settlement fails —
 * it falls back to a local simulation so the demo always completes. The UI only
 * ever sees "signed in", "balance", and "unlocked".
 */

export type Session = {
  email: string;
  address: `0x${string}`;
};

export type Phase =
  | "idle"
  | "preparing"
  | "routing"
  | "settling"
  | "verifying"
  | "unlocked"
  | "error";

export type Receipt = {
  contentId: string;
  amountCents: number;
  sourceChain: string;
  network: "Arbitrum One";
  txHash: `0x${string}`;
  /** Particle activity id (real settlements) → universalx.app view */
  activityId?: string;
  settledAt: number;
};

type Store = {
  session: Session | null;
  receipts: Record<string, Receipt>;
  balanceCents: number;
};

const DEFAULTS: Store = { session: null, receipts: {}, balanceCents: 1240 };

type AccessValue = {
  session: Session | null;
  ready: boolean;
  /** real wallet (Privy + UA) is wired, vs the local demo */
  realMode: boolean;
  balanceCents: number;
  receipts: Record<string, Receipt>;
  isUnlocked: (contentId: string) => boolean;
  receiptFor: (contentId: string) => Receipt | undefined;
  /** open the real login (Privy) when in real mode */
  startLogin: () => void;
  /** demo sign-in used by the branded sheet (no-op effect in real mode) */
  signIn: (email: string) => Promise<Session>;
  signOut: () => void;
  unlock: (
    args: { contentId: string; priceCents: number },
    onPhase?: (p: Phase) => void,
  ) => Promise<{ paragraphs: string[]; receipt: Receipt }>;
  adjustBalance: (deltaCents: number) => void;
  /** auth headers for gate requests (a verified Privy bearer token in real mode) */
  authHeaders: () => Promise<Record<string, string>>;
};

const KEY = "tollgate.v1";
const SOURCE_CHAINS = ["Base", "Polygon", "Optimism", "BNB Chain"];

const AccessContext = createContext<AccessValue | null>(null);

function load(): Store {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Store>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(store: Store) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function addressFromEmail(email: string): `0x${string}` {
  let h = 0x811c9dc5;
  for (let i = 0; i < email.length; i++) {
    h ^= email.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let hex = "";
  let seed = h >>> 0;
  for (let i = 0; i < 40; i++) {
    seed = (Math.imul(seed, 0x01000193) ^ (seed >>> 7)) >>> 0;
    hex += (seed & 0xf).toString(16);
  }
  return `0x${hex}` as `0x${string}`;
}

function randomTxHash(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const realWallet = useRealWallet();
  const realMode = realWallet?.available ?? false;

  const [store, setStore] = useState<Store>(DEFAULTS);
  const [localReady, setLocalReady] = useState(false);

  useEffect(() => {
    setStore(load());
    setLocalReady(true);
  }, []);

  const persist = useCallback((next: Store) => {
    setStore(next);
    save(next);
  }, []);

  // ---- derived session / balance / ready (real vs sim) ----
  const realSession: Session | null =
    realMode && realWallet?.authenticated && realWallet.address
      ? { email: realWallet.email ?? "you@tollgate.xyz", address: realWallet.address }
      : null;
  const session = realMode ? realSession : store.session;
  const balanceCents = realMode ? realWallet?.balanceCents ?? 0 : store.balanceCents;
  const ready = realMode ? realWallet?.ready ?? false : localReady;

  const startLogin = useCallback(() => {
    realWallet?.login();
  }, [realWallet]);

  const signIn = useCallback(
    async (email: string) => {
      // Real mode uses Privy's flow via startLogin; this is the demo path.
      if (realMode) {
        realWallet?.login();
        return { email, address: addressFromEmail(email) };
      }
      await wait(650);
      const next = load();
      const sess: Session = { email, address: addressFromEmail(email) };
      persist({ ...next, session: sess });
      return sess;
    },
    [realMode, realWallet, persist],
  );

  const signOut = useCallback(() => {
    if (realMode) {
      void realWallet?.logout();
      return;
    }
    const cur = load();
    persist({ session: null, receipts: cur.receipts, balanceCents: cur.balanceCents });
  }, [realMode, realWallet, persist]);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (realMode && realWallet?.getAccessToken) {
      try {
        const token = await realWallet.getAccessToken();
        if (token) return { authorization: `Bearer ${token}` };
      } catch {
        /* fall through to no auth */
      }
    }
    return {};
  }, [realMode, realWallet]);

  const unlock = useCallback<AccessValue["unlock"]>(
    async ({ contentId, priceCents }, onPhase) => {
      const payer = realMode ? realWallet?.address : load().session?.address;
      if (!payer) throw new Error("not signed in");

      const phase = (p: Phase) => onPhase?.(p);

      // settle: real Universal Account purchase, or local simulation
      let receipt: Receipt;
      const canReal = realMode && realWallet?.authenticated && realWallet.uaReady;
      if (canReal) {
        try {
          const res = await realWallet!.purchase(
            contentId as `0x${string}`,
            priceCents,
            (p) => phase(p as Phase),
          );
          receipt = {
            contentId,
            amountCents: priceCents,
            sourceChain: res.sourceChain,
            network: "Arbitrum One",
            txHash: res.txHash,
            activityId: res.activityId,
            settledAt: Date.now(),
          };
        } catch (e) {
          console.error("[tollgate] real purchase failed — using demo settle", e);
          receipt = await simulateSettle(contentId, priceCents, phase);
        }
      } else {
        receipt = await simulateSettle(contentId, priceCents, phase);
      }

      // release: the gate verifies entitlement server-side, then returns text
      phase("verifying");
      const res = await fetch(`/api/content/${contentId}`, {
        headers: await authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) {
        phase("error");
        throw new Error(`gate refused release ${res.status}`);
      }
      const data = (await res.json()) as { paragraphs: string[] };

      const next = load();
      persist({
        session: next.session,
        receipts: { ...next.receipts, [contentId]: receipt },
        balanceCents: realMode
          ? next.balanceCents
          : Math.max(0, next.balanceCents - priceCents),
      });
      phase("unlocked");
      return { paragraphs: data.paragraphs, receipt };
    },
    [realMode, realWallet, persist, authHeaders],
  );

  const adjustBalance = useCallback(
    (delta: number) => {
      if (realMode) {
        void realWallet?.refreshBalance();
        return;
      }
      const cur = load();
      persist({ ...cur, balanceCents: Math.max(0, cur.balanceCents + delta) });
    },
    [realMode, realWallet, persist],
  );

  const value = useMemo<AccessValue>(
    () => ({
      session,
      ready,
      realMode,
      balanceCents,
      receipts: store.receipts,
      isUnlocked: (id) => Boolean(store.receipts[id]),
      receiptFor: (id) => store.receipts[id],
      startLogin,
      signIn,
      signOut,
      unlock,
      adjustBalance,
      authHeaders,
    }),
    [
      session,
      ready,
      realMode,
      balanceCents,
      store.receipts,
      startLogin,
      signIn,
      signOut,
      unlock,
      adjustBalance,
      authHeaders,
    ],
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

/** Local cross-chain settlement animation, used when no real wallet settles. */
async function simulateSettle(
  contentId: string,
  priceCents: number,
  phase: (p: Phase) => void,
): Promise<Receipt> {
  const sourceChain =
    SOURCE_CHAINS[Math.floor(Math.random() * SOURCE_CHAINS.length)];
  phase("preparing");
  await wait(280);
  phase("routing");
  await wait(900);
  phase("settling");
  await wait(750);
  return {
    contentId,
    amountCents: priceCents,
    sourceChain,
    network: "Arbitrum One",
    txHash: randomTxHash(),
    settledAt: Date.now(),
  };
}

export function useAccess(): AccessValue {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used within AccessProvider");
  return ctx;
}
