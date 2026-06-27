import Link from "next/link";
import type { Article } from "@/lib/content";
import { formatPrice } from "@/lib/content";
import { CoverPlate } from "./CoverPlate";

export function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/read/${article.slug}`}
      className="group flex h-full flex-col border-t border-ink/15 pt-5 transition"
    >
      <CoverPlate
        tone={article.tone}
        plate={article.plate}
        label={article.kicker}
        className="mb-4 h-28 w-full rounded-[10px]"
      />
      <span className="kicker">{article.kicker}</span>
      <h3 className="display mt-2 text-[1.55rem] leading-[1.05] text-ink transition-colors group-hover:text-vermilion-deep">
        {article.title}
      </h3>
      <p className="mt-2 line-clamp-3 text-[1rem] leading-relaxed text-ink-soft">
        {article.dek}
      </p>
      <div className="mt-auto flex items-center justify-between border-t border-ink/10 pt-3">
        <span className="font-mono text-[0.74rem] text-ink-faint">
          {article.author.name} · {article.readMinutes} min
        </span>
        <span className="rounded-full border border-vermilion/30 bg-vermilion/5 px-2.5 py-0.5 font-mono text-[0.74rem] text-vermilion-deep">
          {formatPrice(article.priceCents)}
        </span>
      </div>
    </Link>
  );
}
