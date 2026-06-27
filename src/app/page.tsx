import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { ArticleCard } from "@/components/ArticleCard";
import { CoverPlate } from "@/components/CoverPlate";
import { LiveActivity } from "@/components/LiveActivity";
import { ARTICLES, formatPrice } from "@/lib/content";

export default function Home() {
  const featured = ARTICLES[0];
  const rest = ARTICLES.slice(1);

  return (
    <main>
      <Masthead />

      {/* hero proposition */}
      <section className="mx-auto max-w-6xl px-5 pt-16 pb-12 sm:pt-24">
        <div className="grid items-end gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="kicker anim-fadeup">A reader for small money</div>
            <h1 className="display anim-fadeup reveal-2 mt-4 text-[clamp(2.8rem,7vw,5.2rem)] text-ink">
              Read what&rsquo;s
              <br />
              worth{" "}
              <em className="italic text-vermilion">paying</em> for.
            </h1>
            <p className="anim-fadeup reveal-3 mt-6 max-w-xl text-[1.2rem] leading-relaxed text-ink-soft">
              Unlock a story or tip a writer with a single tap — no wallet, no
              seed phrase, no gas, no popup. The price is small. The friction is
              gone.
            </p>
            <div className="anim-fadeup reveal-4 mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={`/read/${featured.slug}`}
                className="rounded-full bg-ink px-6 py-3 font-mono text-[0.78rem] uppercase tracking-[0.14em] text-paper transition hover:bg-vermilion"
              >
                Start reading
              </Link>
              <span className="font-mono text-[0.78rem] text-ink-faint">
                Payments settle on Arbitrum — you&rsquo;ll never see a chain.
              </span>
            </div>
          </div>

          <Link
            href={`/read/${featured.slug}`}
            className="group anim-fadeup reveal-3 block"
          >
            <CoverPlate
              tone={featured.tone}
              plate={featured.plate}
              label={featured.kicker}
              big
              className="h-72 w-full rounded-[14px] shadow-[var(--shadow-lift)]"
            />
            <div className="mt-4 flex items-center justify-between">
              <span className="kicker">Featured</span>
              <span className="rounded-full border border-vermilion/30 bg-vermilion/5 px-2.5 py-0.5 font-mono text-[0.74rem] text-vermilion-deep">
                {formatPrice(featured.priceCents)}
              </span>
            </div>
            <h2 className="display mt-2 text-[1.9rem] leading-[1.04] text-ink transition-colors group-hover:text-vermilion-deep">
              {featured.title}
            </h2>
            <p className="mt-2 text-[1rem] leading-relaxed text-ink-soft">
              {featured.dek}
            </p>
          </Link>
        </div>
      </section>

      {/* how it works */}
      <section>
        <div className="mx-auto grid max-w-6xl gap-px px-5 pb-4 pt-2 sm:grid-cols-3">
          <Step n="i" title="Sign in with email">
            A secure account is created in the background. No extension, no
            recovery phrase.
          </Step>
          <Step n="ii" title="Tap to unlock">
            Your balance — wherever it lives — is routed and settled on Arbitrum
            in one gesture.
          </Step>
          <Step n="iii" title="Read">
            The page is yours. A receipt waits, quietly, for the one time you
            want to look.
          </Step>
        </div>
      </section>

      <LiveActivity />

      {/* the stand */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-10 flex items-end justify-between">
          <h2 className="display text-[2rem] text-ink">On the stand</h2>
          <span className="label-mono">{ARTICLES.length} pieces</span>
        </div>
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>

      <footer className="border-t border-ink/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
          <span className="display text-[1.3rem] text-ink">Tollgate</span>
          <span className="font-mono text-[0.74rem] text-ink-faint">
            Small money for good work · settled on Arbitrum · powered by Universal
            Accounts &amp; EIP-7702
          </span>
        </div>
      </footer>
    </main>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 px-2 py-5">
      <span className="display text-[1.6rem] italic text-vermilion/70">{n}.</span>
      <div>
        <div className="font-mono text-[0.78rem] uppercase tracking-[0.12em] text-ink">
          {title}
        </div>
        <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-soft">
          {children}
        </p>
      </div>
    </div>
  );
}
