import { NextRequest, NextResponse } from "next/server";
import { ARTICLES } from "@/lib/content";
import { PAID } from "@/lib/content.server";
import { SETTLEMENT, verifyEntitlement } from "@/lib/paywall.server";

export const dynamic = "force-dynamic";

/**
 * Machine-payable rail (x402-style) so an AI agent can pay-per-read.
 *
 *   GET (no payment)    → 402 + an x402 `accepts` quote (USDC on Arbitrum)
 *   GET (with payment)  → 200 + the full piece as markdown
 *
 * Same settlement and the same on-chain `hasAccess` gate as the human reader —
 * the only difference is the caller is a program, and the body comes back as text.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const article = ARTICLES.find((a) => a.contentId === id);
  const paid = PAID[id];
  if (!article || !paid) {
    return NextResponse.json({ error: "unknown_content" }, { status: 404 });
  }

  // Agents authenticate by paying. A production build verifies the x402 payment
  // proof here — recovering the signer from the signed EIP-3009 authorization and
  // using that address as the payer — before release. Until then the live gate
  // stays closed and only the demo sandbox (TOLLGATE_DEMO) opens.
  const entitled = await verifyEntitlement(id, null);
  if (!entitled) {
    // USDC has 6 decimals: cents → atomic = cents * 1e4
    const accepts = [
      {
        scheme: "exact",
        network: `eip155:${SETTLEMENT.chainId}`,
        maxAmountRequired: String(article.priceCents * 10_000),
        asset: SETTLEMENT.assetAddress,
        payTo: SETTLEMENT.payTo,
        resource: `/api/agent/${id}`,
        description: `Unlock: ${article.title}`,
        mimeType: "text/markdown",
      },
    ];
    const quote = { x402Version: 2, error: "payment_required", accepts };
    return NextResponse.json(quote, {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(quote)).toString("base64"),
      },
    });
  }

  const markdown = [
    `# ${article.title}`,
    `_${article.dek}_`,
    `By ${article.author.name}`,
    ...article.free,
    ...paid,
  ].join("\n\n");

  return NextResponse.json({
    contentId: id,
    title: article.title,
    author: article.author.name,
    markdown,
  });
}
