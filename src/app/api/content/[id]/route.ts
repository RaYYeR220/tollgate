import { NextRequest, NextResponse } from "next/server";
import { PAID } from "@/lib/content.server";
import { paymentRequirements, verifyEntitlement } from "@/lib/paywall.server";
import { verifiedPayer } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

/**
 * The toll gate. The only route that can hand out paid paragraphs.
 *
 *   GET  (no proof)   → 402 Payment Required + the settlement quote
 *   GET  (valid proof)→ 200 + the gated paragraphs
 *
 * The body is never rendered on the client until it comes back from here, so the
 * paywall is enforced by settlement, not by hiding a <div>.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const paragraphs = PAID[id];
  if (!paragraphs) {
    return NextResponse.json({ error: "unknown_content" }, { status: 404 });
  }

  // The payer is derived from a verified Privy session — never from a header.
  const payer = await verifiedPayer(req);

  const entitled = await verifyEntitlement(id, payer);
  if (!entitled) {
    return NextResponse.json(
      { error: "payment_required", payment: paymentRequirements(id) },
      { status: 402 },
    );
  }

  return NextResponse.json({ contentId: id, paragraphs });
}
