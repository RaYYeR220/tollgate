import Link from "next/link";
import { recentActivity } from "@/lib/registry";
import { formatPrice } from "@/lib/content";

/**
 * Live unlocks ticker. Seeded today; reads AccessGranted logs from the registry
 * once deployed. Pure social proof — and a quiet reminder the settlement is real.
 */
export function LiveActivity() {
  const items = recentActivity(10);
  const loop = [...items, ...items];

  return (
    <div className="marquee border-y border-ink/15 bg-paper-2/40">
      <div className="mx-auto flex max-w-full items-center gap-5 px-5 py-2.5">
        <div className="flex shrink-0 items-center gap-2">
          <span className="live-dot h-2 w-2 rounded-full bg-vermilion" />
          <span className="label-mono whitespace-nowrap">Happening now</span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="animate-marquee flex w-max gap-8">
            {loop.map((it, i) => (
              <Link
                key={i}
                href={`/read/${it.slug}`}
                className="group flex shrink-0 items-center gap-2 whitespace-nowrap"
              >
                <span className="font-mono text-[0.74rem] text-ink-faint">
                  {it.reader}
                </span>
                <span className="text-[0.84rem] text-ink-soft">unlocked</span>
                <span className="text-[0.88rem] text-ink group-hover:text-vermilion-deep">
                  {it.title}
                </span>
                <span className="rounded-full bg-vermilion/8 px-2 py-0.5 font-mono text-[0.68rem] text-vermilion-deep">
                  {formatPrice(it.amountCents)}
                </span>
                <span className="font-mono text-[0.7rem] text-ink-faint">
                  {it.sourceChain} · {it.ago}
                </span>
                <span className="text-ink-faint/40">/</span>
              </Link>
            ))}
          </div>
          {/* edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-paper-2/80 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-paper-2/80 to-transparent" />
        </div>
      </div>
    </div>
  );
}
