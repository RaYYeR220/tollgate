"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccess, type Receipt } from "@/lib/access";
import { ARTICLES } from "@/lib/content";
import { formatUSD } from "@/lib/registry";
import { simulateSettle } from "@/lib/ua";

const CHAINS = [
  { name: "Base", pct: 0.42, color: "#0052ff" },
  { name: "Polygon", pct: 0.28, color: "#8247e5" },
  { name: "Arbitrum One", pct: 0.18, color: "#28a0f0" },
  { name: "Optimism", pct: 0.12, color: "#ff0420" },
];

const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-6)}`;
const titleFor = (id: string) =>
  ARTICLES.find((a) => a.contentId === id)?.title ?? "Unlocked piece";
const slugFor = (id: string) =>
  ARTICLES.find((a) => a.contentId === id)?.slug ?? "";

export function AccountView() {
  const { session, ready, balanceCents, receipts, adjustBalance, realMode } =
    useAccess();
  const [busy, setBusy] = useState<null | "topup" | "withdraw">(null);

  const history = useMemo<Receipt[]>(
    () => Object.values(receipts).sort((a, b) => b.settledAt - a.settledAt),
    [receipts],
  );
  const spent = useMemo(
    () => history.reduce((s, r) => s + r.amountCents, 0),
    [history],
  );

  if (ready && !session) {
    return (
      <div className="mx-auto max-w-md px-5 py-28 text-center">
        <div className="kicker mb-3">Your account</div>
        <h1 className="display text-[2.4rem] text-ink">Sign in to see it.</h1>
        <p className="mt-3 text-ink-soft">
          Your library, your receipts, and the balance you spend from — all in
          one place.
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

  const topUp = async () => {
    setBusy("topup");
    await simulateSettle(undefined, { routeMs: 500, settleMs: 500 });
    adjustBalance(500);
    setBusy(null);
  };
  const withdraw = async () => {
    if (balanceCents < 500) return;
    setBusy("withdraw");
    await simulateSettle(undefined, { routeMs: 500, settleMs: 500 });
    adjustBalance(-500);
    setBusy(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="kicker">Your account</div>
      <h1 className="display mt-2 text-[2.6rem] text-ink">
        {session?.email ?? "Reader"}
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        {/* balance / funds */}
        <section className="rounded-xl border border-ink/15 bg-paper-2/40 p-6">
          <div className="label-mono">Universal balance</div>
          <div className="mt-2 font-mono text-[2.6rem] leading-none text-ink">
            {formatUSD(balanceCents)}
          </div>
          <p className="mt-2 text-[0.85rem] text-ink-soft">
            One balance, pooled from every chain your funds sit on. Spend it
            anywhere on Tollgate.
          </p>

          {/* chain split — illustrative in demo; real balances come from the UA */}
          {realMode ? (
            <p className="mt-4 text-[0.8rem] leading-relaxed text-ink-faint">
              Pooled from every chain your funds sit on, by your Universal
              Account. Full asset breakdown lives on{" "}
              <a
                href="https://universalx.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-vermilion-deep underline decoration-vermilion/30 underline-offset-2"
              >
                universalx.app
              </a>
              .
            </p>
          ) : (
            <div className="mt-5">
              <div className="flex h-3 overflow-hidden rounded-full">
                {CHAINS.map((c) => (
                  <div
                    key={c.name}
                    style={{ width: `${c.pct * 100}%`, background: c.color }}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {CHAINS.map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: c.color }}
                    />
                    <span className="font-mono text-[0.72rem] text-ink-soft">
                      {c.name}
                    </span>
                    <span className="ml-auto font-mono text-[0.72rem] text-ink">
                      {formatUSD(Math.round(balanceCents * c.pct))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={topUp}
              disabled={busy !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 font-mono text-[0.74rem] uppercase tracking-[0.12em] text-paper transition hover:bg-vermilion disabled:opacity-60"
            >
              {busy === "topup" ? <Spin /> : "Top up $5"}
            </button>
            <button
              onClick={withdraw}
              disabled={busy !== null || balanceCents < 500}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-ink/25 px-4 py-2.5 font-mono text-[0.74rem] uppercase tracking-[0.12em] text-ink transition hover:border-ink/50 disabled:opacity-40"
            >
              {busy === "withdraw" ? <Spin dark /> : "Withdraw $5"}
            </button>
          </div>
        </section>

        {/* library */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <span className="label-mono">Your library</span>
            <span className="font-mono text-[0.74rem] text-ink-faint">
              {history.length} unlocked · {formatUSD(spent)} spent
            </span>
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink/20 p-10 text-center">
              <p className="text-ink-soft">Nothing unlocked yet.</p>
              <Link
                href="/"
                className="mt-3 inline-block font-mono text-[0.76rem] uppercase tracking-[0.12em] text-vermilion-deep hover:underline"
              >
                Find something worth paying for →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-ink/10 overflow-hidden rounded-xl border border-ink/15">
              {history.map((r) => (
                <div
                  key={r.contentId}
                  className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-paper-2/50"
                >
                  <Link
                    href={`/read/${slugFor(r.contentId)}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-vermilion/10 font-mono text-[0.7rem] text-vermilion-deep">
                      {r.amountCents % 100 === 0
                        ? `$${r.amountCents / 100}`
                        : `${r.amountCents}¢`}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[1rem] text-ink">
                        {titleFor(r.contentId)}
                      </div>
                      <div className="font-mono text-[0.7rem] text-ink-faint">
                        {r.sourceChain} → {r.network}
                      </div>
                    </div>
                  </Link>
                  <a
                    href={
                      r.activityId
                        ? `https://universalx.app/activity/details?id=${r.activityId}`
                        : `https://arbiscan.io/tx/${r.txHash}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 font-mono text-[0.7rem] text-ink-faint hover:text-vermilion-deep"
                  >
                    {r.activityId ? "view ↗" : short(r.txHash)}
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Spin({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`spin inline-block h-3.5 w-3.5 rounded-full border-2 ${dark ? "border-ink/30 border-t-ink" : "border-paper/40 border-t-paper"}`}
    />
  );
}
