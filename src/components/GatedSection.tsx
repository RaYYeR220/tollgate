"use client";

import { useEffect, useState } from "react";
import { useAccess, type Phase } from "@/lib/access";
import { formatPrice } from "@/lib/content";
import { SignInSheet } from "./SignInSheet";
import { TicketStub } from "./TicketStub";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "",
  preparing: "Preparing",
  routing: "Routing your balance",
  settling: "Settling on Arbitrum",
  verifying: "Unlocking",
  unlocked: "Unlocked",
  error: "",
};

export function GatedSection({
  contentId,
  priceCents,
  gatedParagraphs,
  title,
}: {
  contentId: string;
  priceCents: number;
  gatedParagraphs: number;
  title: string;
}) {
  const {
    session,
    ready,
    isUnlocked,
    receiptFor,
    unlock,
    realMode,
    startLogin,
    authHeaders,
  } = useAccess();
  const unlocked = isUnlocked(contentId);
  const receipt = receiptFor(contentId);

  const [paragraphs, setParagraphs] = useState<string[] | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [signInOpen, setSignInOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy =
    phase === "preparing" ||
    phase === "routing" ||
    phase === "settling" ||
    phase === "verifying";

  // Already paid (e.g. after a reload): re-present the settlement proof to the
  // gate and pull the released text back from the server. The body is never
  // cached on the client, so this round-trips the server every time.
  useEffect(() => {
    let active = true;
    void (async () => {
      if (!(unlocked && session && receipt && !paragraphs)) return;
      try {
        const r = await fetch(`/api/content/${contentId}`, {
          headers: await authHeaders(),
          cache: "no-store",
        });
        if (!r.ok) return;
        const d = (await r.json()) as { paragraphs: string[] };
        if (active && d) setParagraphs(d.paragraphs);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [unlocked, session, receipt, contentId, paragraphs, authHeaders]);

  const doUnlock = async () => {
    setError(null);
    try {
      const res = await unlock({ contentId, priceCents }, setPhase);
      setParagraphs(res.paragraphs);
    } catch {
      setPhase("idle");
      setError("Something interrupted the payment. Your balance wasn't touched.");
    }
  };

  const onUnlockClick = () => {
    if (!session) {
      if (realMode) startLogin();
      else setSignInOpen(true);
      return;
    }
    doUnlock();
  };

  if (paragraphs) {
    return (
      <section className="mt-2">
        <Divider label="The rest" />
        <div className="prose-body anim-unblur">
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="anim-fadeup"
              style={{ animationDelay: `${Math.min(i, 5) * 0.07}s` }}
            >
              {p}
            </p>
          ))}
        </div>
        {receipt && (
          <div className="mx-auto mt-10 max-w-sm">
            <TicketStub receipt={receipt} title={title} />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="relative mt-2">
      {/* faux locked text bleeding up behind the gate */}
      <div className="gated-blur space-y-3" aria-hidden>
        {Array.from({ length: Math.max(8, gatedParagraphs * 3) }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded bg-ink/20"
            style={{ width: `${72 + ((i * 37) % 28)}%` }}
          />
        ))}
      </div>

      {/* the gate */}
      <div className="relative z-10 -mt-24">
        <div className="mx-auto max-w-md">
          <div className="perf-top h-3 bg-paper-3" />
          <div className="rounded-b-[14px] border border-t-0 border-ink/15 bg-paper p-7 shadow-[var(--shadow-lift)]">
            <div className="kicker mb-3">The rest of this story</div>
            <div className="flex items-end justify-between">
              <p className="display max-w-[14rem] text-[1.5rem] leading-tight text-ink">
                Read on for {formatPrice(priceCents)}.
              </p>
              <div className="text-right">
                <div className="font-mono text-[2rem] leading-none text-vermilion">
                  {formatPrice(priceCents)}
                </div>
                <div className="label-mono mt-1">one tap</div>
              </div>
            </div>

            <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
              Pay with the balance you already hold — no wallet, no seed phrase,
              no gas, no popup. It settles on Arbitrum and the page is yours.
            </p>

            <button
              onClick={onUnlockClick}
              disabled={busy}
              className="relative mt-5 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-lg bg-ink px-5 py-4 font-mono text-[0.84rem] uppercase tracking-[0.12em] text-paper transition hover:bg-vermilion disabled:cursor-progress"
            >
              {busy && <span className="scanline" />}
              {busy ? (
                <>
                  <span className="spin inline-block h-3.5 w-3.5 rounded-full border-2 border-paper/40 border-t-paper" />
                  {PHASE_LABEL[phase]}
                  <Dots />
                </>
              ) : !ready ? (
                "Loading"
              ) : session ? (
                `Unlock for ${formatPrice(priceCents)}`
              ) : (
                "Sign in & unlock"
              )}
            </button>

            {error && (
              <p className="mt-3 text-center text-[0.8rem] text-vermilion-deep">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center justify-center gap-2 border-t border-ink/10 pt-4">
              <ChainDots />
              <span className="text-[0.72rem] text-ink-faint">
                Funds anywhere — they land on Arbitrum automatically
              </span>
            </div>
          </div>
        </div>
      </div>

      {!realMode && (
        <SignInSheet
          open={signInOpen}
          onClose={() => setSignInOpen(false)}
          onSignedIn={doUnlock}
        />
      )}
    </section>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-8 flex items-center gap-4">
      <span className="hairline-gold flex-1" />
      <span className="label-mono">{label}</span>
      <span className="hairline-gold flex-1" />
    </div>
  );
}

function Dots() {
  return (
    <span className="inline-flex w-3 justify-start">
      <span className="animate-pulse">…</span>
    </span>
  );
}

function ChainDots() {
  const colors = ["#0052ff", "#8247e5", "#ff0420", "#f3ba2f"];
  return (
    <span className="flex -space-x-1.5" aria-hidden>
      {colors.map((c) => (
        <span
          key={c}
          className="h-4 w-4 rounded-full border-2 border-paper"
          style={{ background: c }}
        />
      ))}
    </span>
  );
}
