import type { Receipt } from "@/lib/access";
import { formatPrice } from "@/lib/content";

const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-8)}`;

/**
 * The receipt stub. Crypto made visible — but only for the one time in a
 * thousand you actually want to look. Everything technical lives here so the
 * page itself can stay quiet.
 */
export function TicketStub({
  receipt,
  title,
}: {
  receipt: Receipt;
  title: string;
}) {
  const time = new Date(receipt.settledAt).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });

  return (
    <aside className="anim-stub relative mt-2 select-text">
      <div className="perf-top h-3 bg-paper-3" />
      <div className="relative rounded-b-[12px] border border-t-0 border-ink/15 bg-paper-2/70 p-5 shadow-[var(--shadow-stub)]">
        <div className="absolute right-5 top-4">
          <span className="stamp anim-stamp inline-block text-[0.8rem] font-bold">
            Paid
          </span>
        </div>

        <div className="label-mono mb-4">Tollgate · Receipt</div>

        <Row k="Item" v={title} />
        <Row k="Amount" v={`${formatPrice(receipt.amountCents)} USDC`} />
        <Row k="From" v={`${receipt.sourceChain} balance`} />
        <Row k="Settled on" v={receipt.network} accent />
        <Row
          k={receipt.activityId ? "Settlement" : "Tx"}
          v={
            <a
              href={
                receipt.activityId
                  ? `https://universalx.app/activity/details?id=${receipt.activityId}`
                  : `https://arbiscan.io/tx/${receipt.txHash}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-vermilion-deep underline decoration-vermilion/30 underline-offset-2 hover:decoration-vermilion"
            >
              {receipt.activityId ? "view ↗" : short(receipt.txHash)}
            </a>
          }
        />
        <Row k="Time" v={time} />

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink/10 pt-3 text-[0.72rem] text-ink-faint">
          <Tick /> Gas sponsored — no popup
          <Tick /> Cross-chain via Universal Account
          <Tick /> EIP-7702
        </div>
      </div>
    </aside>
  );
}

function Row({
  k,
  v,
  accent = false,
}: {
  k: string;
  v: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-ink/12 py-1.5 last:border-0">
      <span className="font-mono text-[0.72rem] uppercase tracking-[0.1em] text-ink-faint">
        {k}
      </span>
      <span
        className={`text-right font-mono text-[0.82rem] ${accent ? "text-vermilion-deep" : "text-ink"}`}
      >
        {v}
      </span>
    </div>
  );
}

function Tick() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="inline-block text-gold"
    >
      <path
        d="M2 6.4 4.6 9 10 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
