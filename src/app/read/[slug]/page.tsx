import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Masthead } from "@/components/Masthead";
import { GatedSection } from "@/components/GatedSection";
import { CoverPlate } from "@/components/CoverPlate";
import { ARTICLES, getArticle, formatPrice } from "@/lib/content";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Not found · Tollgate" };
  return { title: `${article.title} · Tollgate`, description: article.dek };
}

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <main>
      <Masthead />

      <article className="mx-auto max-w-[680px] px-5 pb-24 pt-12">
        <Link
          href="/"
          className="font-mono text-[0.74rem] uppercase tracking-[0.12em] text-ink-faint transition hover:text-vermilion-deep"
        >
          ← The stand
        </Link>

        <header className="mt-8">
          <div className="kicker">{article.kicker}</div>
          <h1 className="display mt-3 text-[clamp(2.4rem,6vw,3.6rem)] text-ink">
            {article.title}
          </h1>
          <p className="mt-5 font-[var(--font-body)] text-[1.3rem] italic leading-snug text-ink-soft">
            {article.dek}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-ink/15 py-3">
            <span className="text-[0.95rem] text-ink">
              By <span className="font-medium">{article.author.name}</span>
            </span>
            <span className="text-ink-faint">·</span>
            <span className="font-mono text-[0.76rem] text-ink-faint">
              {article.readMinutes} min read
            </span>
            <span className="ml-auto rounded-full border border-vermilion/30 bg-vermilion/5 px-3 py-0.5 font-mono text-[0.76rem] text-vermilion-deep">
              {formatPrice(article.priceCents)} to finish
            </span>
          </div>
        </header>

        <CoverPlate
          tone={article.tone}
          plate={article.plate}
          label={article.kicker}
          big
          className="mt-8 h-56 w-full rounded-[14px]"
        />

        <div className="prose-body mt-10">
          {article.free.map((p, i) => (
            <p key={i} className={i === 0 ? "dropcap" : undefined}>
              {p}
            </p>
          ))}
        </div>

        <GatedSection
          contentId={article.contentId}
          priceCents={article.priceCents}
          gatedParagraphs={article.gatedParagraphs}
          title={article.title}
        />

        <footer className="mt-16 border-t border-ink/15 pt-7">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink font-mono text-[1rem] uppercase text-paper">
              {article.author.name[0]}
            </span>
            <div>
              <div className="display text-[1.25rem] text-ink">
                {article.author.name}
              </div>
              <div className="font-mono text-[0.74rem] text-ink-faint">
                @{article.author.handle}
              </div>
              <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-soft">
                {article.author.bio}
              </p>
            </div>
          </div>
        </footer>
      </article>
    </main>
  );
}
