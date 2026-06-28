"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccess } from "@/lib/access";
import { contentStats, formatUSD, type ContentStats } from "@/lib/registry";
import { simulateSettle, type SettlePhase } from "@/lib/ua";

const FEE_BPS = 250; // matches the deployed registry's protocol fee
const net = (gross: number) => Math.round(gross * (1 - FEE_BPS / 10_000));

type Published = {
  contentId: string;
  slug: string;
  title: string;
  priceCents: number;
  unlocks: number;
  grossCents: number;
  fresh: boolean;
};

const SKEY = "tollgate.studio.v1";

export function StudioView() {
  const { session, ready } = useAccess();
  const [extra, setExtra] = useState<Published[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SKEY);
      if (raw) {
        const s = JSON.parse(raw);
        setExtra(s.extra ?? []);
      }
    } catch {}
  }, []);

  const persist = (nextExtra: Published[]) => {
    setExtra(nextExtra);
    try {
      localStorage.setItem(SKEY, JSON.stringify({ extra: nextExtra }));
    } catch {}
  };

  const catalogue: Published[] = useMemo(() => {
    const seeded: Published[] = contentStats().map((c: ContentStats) => ({
      ...c,
      fresh: false,
    }));
    return [...extra, ...seeded];
  }, [extra]);

  const totals = useMemo(() => {
    const gross = catalogue.reduce((s, c) => s + c.grossCents, 0);
    const unlocks = catalogue.reduce((s, c) => s + c.unlocks, 0);
    return {
      gross,
      net: net(gross),
      unlocks,
      pieces: catalogue.length,
    };
  }, [catalogue]);

  if (ready && !session) {
    return (
      <div className="mx-auto max-w-md px-5 py-28 text-center">
        <div className="kicker mb-3">Tollgate Studio</div>
        <h1 className="display text-[2.4rem] text-ink">Sign in to publish.</h1>
        <p className="mt-3 text-ink-soft">
          Your studio shows what readers paid for, in real time. Use the Sign in
          button up top to open it.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block font-mono text-[0.78rem] uppercase tracking-[0.12em] text-vermilion-deep hover:underline"
        >
          ← Back to the stand
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Tollgate Studio</div>
          <h1 className="display mt-2 text-[2.6rem] text-ink">
            Your publication
          </h1>
        </div>
        <button
          onClick={() => setShowPublish(true)}
          className="rounded-full bg-ink px-5 py-2.5 font-mono text-[0.74rem] uppercase tracking-[0.14em] text-paper transition hover:bg-vermilion"
        >
          + Publish a piece
        </button>
      </div>

      {/* stat row */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Earnings (net)" value={formatUSD(totals.net)} accent />
        <Stat label="Gross volume" value={formatUSD(totals.gross)} />
        <Stat label="Unlocks" value={totals.unlocks.toLocaleString()} />
        <Stat label="Live pieces" value={String(totals.pieces)} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* revenue by piece */}
        <section>
          <div className="label-mono mb-4">Revenue by piece</div>
          <div className="space-y-3">
            {catalogue.map((c) => (
              <RevenueBar
                key={c.contentId}
                title={c.title}
                slug={c.slug}
                grossCents={c.grossCents}
                max={Math.max(...catalogue.map((x) => x.grossCents), 1)}
                fresh={c.fresh}
              />
            ))}
          </div>
        </section>

        {/* payout */}
        <PayoutPanel earned={totals.net} unlocks={totals.unlocks} />
      </div>

      {/* content table */}
      <section className="mt-12">
        <div className="label-mono mb-4">Catalogue</div>
        <div className="overflow-hidden rounded-xl border border-ink/15">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-ink/15 bg-paper-2/50">
                <Th>Piece</Th>
                <Th right>Price</Th>
                <Th right>Unlocks</Th>
                <Th right>Revenue</Th>
                <Th right>Share</Th>
              </tr>
            </thead>
            <tbody>
              {catalogue.map((c) => (
                <tr
                  key={c.contentId}
                  className="border-b border-ink/10 last:border-0"
                >
                  <td className="px-4 py-3">
                    <span className="text-[1rem] text-ink">{c.title}</span>
                    {c.fresh && (
                      <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-gold">
                        new
                      </span>
                    )}
                  </td>
                  <Td right mono>
                    {c.priceCents % 100 === 0
                      ? `$${c.priceCents / 100}`
                      : `${c.priceCents}¢`}
                  </Td>
                  <Td right mono>
                    {c.unlocks.toLocaleString()}
                  </Td>
                  <Td right mono accent>
                    {formatUSD(c.grossCents)}
                  </Td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/read/${c.slug}`}
                      className="font-mono text-[0.74rem] text-vermilion-deep hover:underline"
                    >
                      open ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showPublish && (
        <PublishSheet
          busy={publishing}
          onClose={() => !publishing && setShowPublish(false)}
          onPublish={async (title, priceCents, onPhase) => {
            setPublishing(true);
            await simulateSettle(onPhase);
            const id = `0x${Math.abs(hashCode(title + priceCents))
              .toString(16)
              .padStart(8, "0")}${"0".repeat(56)}`;
            const item: Published = {
              contentId: id,
              slug: "the-price-of-attention",
              title,
              priceCents,
              unlocks: 0,
              grossCents: 0,
              fresh: true,
            };
            persist([item, ...extra]);
            setPublishing(false);
            setShowPublish(false);
          }}
        />
      )}
    </div>
  );
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-ink/15 bg-paper-2/40 p-5">
      <div className="label-mono">{label}</div>
      <div
        className={`mt-2 font-mono text-[1.7rem] ${accent ? "text-vermilion" : "text-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}

function RevenueBar({
  title,
  slug,
  grossCents,
  max,
  fresh,
}: {
  title: string;
  slug: string;
  grossCents: number;
  max: number;
  fresh: boolean;
}) {
  const pct = Math.max(2, Math.round((grossCents / max) * 100));
  return (
    <Link href={`/read/${slug}`} className="group block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[0.95rem] text-ink group-hover:text-vermilion-deep">
          {title}
        </span>
        <span className="font-mono text-[0.78rem] text-ink-soft">
          {formatUSD(grossCents)}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-paper-3">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: fresh
              ? "var(--color-gold)"
              : "linear-gradient(90deg, var(--color-vermilion), var(--color-vermilion-deep))",
          }}
        />
      </div>
    </Link>
  );
}

function PayoutPanel({
  earned,
  unlocks,
}: {
  earned: number;
  unlocks: number;
}) {
  return (
    <aside className="rounded-xl border border-ink/15 bg-paper-2/40 p-6">
      <div className="label-mono">Earned · in your wallet</div>
      <div className="mt-2 font-mono text-[2.2rem] text-ink">
        {formatUSD(earned)}
      </div>
      <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-soft">
        Paid to your Universal Account the instant a reader unlocks —
        non-custodial, no payout schedule. It&rsquo;s already yours, spendable on
        any chain.
      </p>
      <a
        href="https://arbiscan.io/address/0x4d321a3ca567224fd3667b570dba458fc4262651"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-ink/20 px-5 py-3 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-ink transition hover:border-vermilion hover:text-vermilion"
      >
        Settled on Arbitrum One · view contract →
      </a>
      <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3">
        <span className="label-mono">Unlocks</span>
        <span className="font-mono text-[0.82rem] text-ink">
          {unlocks.toLocaleString()}
        </span>
      </div>
    </aside>
  );
}

function PublishSheet({
  busy,
  onClose,
  onPublish,
}: {
  busy: boolean;
  onClose: () => void;
  onPublish: (
    title: string,
    priceCents: number,
    onPhase: (p: SettlePhase) => void,
  ) => void;
}) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("50");
  const [phase, setPhase] = useState<SettlePhase | "idle">("idle");

  const label: Record<string, string> = {
    preparing: "Preparing",
    routing: "Registering on Arbitrum",
    settling: "Confirming",
    verifying: "Finishing",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-md anim-fadeup">
        <div className="m-3 rounded-[14px] border border-ink/15 bg-paper p-7 shadow-[0_30px_80px_-30px_#1a1613aa]">
          <div className="kicker mb-3">New piece</div>
          <h2 className="display text-[1.9rem] text-ink">Publish to Tollgate.</h2>
          <p className="mt-2 mb-5 text-[0.92rem] text-ink-soft">
            Set a price. Readers pay once to unlock; you&rsquo;re paid the moment
            they do.
          </p>

          <label className="label-mono mb-2 block">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="An honest essay about…"
            disabled={busy}
            className="mb-4 w-full rounded-lg border border-ink/20 bg-paper-2/60 px-4 py-3 text-[1rem] text-ink outline-none focus:border-vermilion focus:ring-2 focus:ring-vermilion/20"
          />

          <label className="label-mono mb-2 block">Price (cents)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            disabled={busy}
            className="mb-5 w-full rounded-lg border border-ink/20 bg-paper-2/60 px-4 py-3 font-mono text-[1rem] text-ink outline-none focus:border-vermilion focus:ring-2 focus:ring-vermilion/20"
          />

          <button
            onClick={() =>
              onPublish(title.trim() || "Untitled", Number(price) || 50, setPhase)
            }
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3.5 font-mono text-[0.8rem] uppercase tracking-[0.12em] text-paper transition hover:bg-vermilion disabled:opacity-70"
          >
            {busy ? (
              <>
                <span className="spin inline-block h-3.5 w-3.5 rounded-full border-2 border-paper/40 border-t-paper" />
                {label[phase] ?? "Publishing"}
              </>
            ) : (
              "Publish"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  right = false,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`px-4 py-3 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ink-faint ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right = false,
  mono = false,
  accent = false,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 ${right ? "text-right" : ""} ${mono ? "font-mono text-[0.85rem]" : ""} ${accent ? "text-vermilion-deep" : "text-ink"}`}
    >
      {children}
    </td>
  );
}
