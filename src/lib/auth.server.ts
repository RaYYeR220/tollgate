/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { PrivyClient } from "@privy-io/server-auth";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const APP_SECRET = process.env.PRIVY_APP_SECRET;

let client: PrivyClient | null = null;
function privy(): PrivyClient | null {
  if (client) return client;
  if (!APP_ID || !APP_SECRET) return null;
  client = new PrivyClient(APP_ID, APP_SECRET);
  return client;
}

function bearer(req: Request): string | null {
  const auth = req.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

/**
 * The wallet address bound to a *verified* Privy session, or null.
 *
 * The gate uses this instead of any client-supplied address: the caller proves
 * who they are with a signed Privy token, and the server derives the payer from
 * it. A request can no longer assert someone else's identity to read content
 * they paid for. Returns null (→ deny in a live build) on any failure.
 */
export async function verifiedPayer(req: Request): Promise<string | null> {
  const p = privy();
  const token = bearer(req);
  if (!p || !token) return null;
  try {
    const claims = await p.verifyAuthToken(token);
    const user: any = await p.getUser((claims as any).userId);
    const accounts: any[] = user?.linkedAccounts ?? [];
    const wallet =
      accounts.find(
        (a) => a.type === "wallet" && a.walletClientType === "privy",
      ) ?? accounts.find((a) => a.type === "wallet");
    return wallet?.address ?? null;
  } catch {
    return null;
  }
}
