import { ARTICLES, type Article } from "./content";

/**
 * Read layer over TollgateAccessRegistry.
 *
 * Today these are seeded deterministically from the catalogue so the dashboards
 * and activity feed render real-feeling numbers with no backend. Once the
 * registry is deployed, each function is replaced by an RPC read
 * (`getCreatorContents`, `getContent`, `AccessGranted` logs) returning the same
 * shapes. Deterministic seeds keep server and client render identical (no
 * hydration drift) and avoid `Date.now()` in render.
 */

export type ContentStats = {
  contentId: string;
  slug: string;
  title: string;
  priceCents: number;
  unlocks: number;
  grossCents: number;
};

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seededUnlocks(article: Article): number {
  const h = hash(article.contentId);
  // cheaper pieces sell more copies; range ~ 60..540
  const base = 60 + (h % 320);
  const priceFactor = Math.round(120 / Math.max(25, article.priceCents));
  return base + priceFactor * 18;
}

export function contentStats(): ContentStats[] {
  return ARTICLES.map((a) => {
    const unlocks = seededUnlocks(a);
    return {
      contentId: a.contentId,
      slug: a.slug,
      title: a.title,
      priceCents: a.priceCents,
      unlocks,
      grossCents: unlocks * a.priceCents,
    };
  });
}

export type ProtocolStats = {
  unlocks: number;
  volumeCents: number;
  pieces: number;
  creators: number;
};

export function protocolStats(): ProtocolStats {
  const stats = contentStats();
  return {
    unlocks: stats.reduce((s, c) => s + c.unlocks, 0),
    volumeCents: stats.reduce((s, c) => s + c.grossCents, 0),
    pieces: stats.length,
    creators: new Set(ARTICLES.map((a) => a.author.handle)).size,
  };
}

export type ActivityItem = {
  id: string;
  title: string;
  slug: string;
  reader: string;
  amountCents: number;
  sourceChain: string;
  ago: string;
};

const CHAINS = ["Base", "Polygon", "Optimism", "BNB Chain", "Base", "Polygon"];
const AGO = ["just now", "1m", "3m", "7m", "12m", "18m", "26m", "39m", "51m", "1h", "1h", "2h"];

function fakeReader(seed: number): string {
  const hex = (seed * 2654435761) >>> 0;
  const s = hex.toString(16).padStart(8, "0");
  return `0x${s.slice(0, 4)}…${s.slice(4, 8)}`;
}

/** A deterministic recent-unlocks feed (would be AccessGranted logs on-chain). */
export function recentActivity(count = 12): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (let i = 0; i < count; i++) {
    const a = ARTICLES[(i * 3 + 1) % ARTICLES.length];
    out.push({
      id: `${a.slug}-${i}`,
      title: a.title,
      slug: a.slug,
      reader: fakeReader(hash(a.contentId) + i * 97),
      amountCents: a.priceCents,
      sourceChain: CHAINS[i % CHAINS.length],
      ago: AGO[i % AGO.length],
    });
  }
  return out;
}

export function formatUSD(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
