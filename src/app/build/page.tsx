import type { Metadata } from "next";
import Link from "next/link";
import { Masthead } from "@/components/Masthead";

export const metadata: Metadata = {
  title: "Build · Tollgate",
  description:
    "Put a pay-per-unlock tollgate on anything you publish. One contract, one SDK, settled on Arbitrum.",
};

const ROUTE = `// app/api/content/[id]/route.ts
import { createTollgate } from "@tollgate/sdk";
import { PAID } from "@/content";

const tollgate = createTollgate({
  registry: process.env.TOLLGATE_REGISTRY!, // on Arbitrum One
});

export async function GET(req, { params }) {
  const { id } = await params;
  const payer = await verifiedPayer(req); // from the auth session, not a header

  // entitlement is read from chain — the client cannot forge it
  if (!(await tollgate.hasAccess(payer, id))) {
    return Response.json(
      { error: "payment_required", payment: tollgate.requirements(id, 50) },
      { status: 402 },
    );
  }
  return Response.json({ paragraphs: PAID[id] }); // released only after settlement
}`;

const PAY = `// the reader pays from a Universal Account — one tap, gasless, cross-chain
import { CHAIN_ID } from "@particle-network/universal-account-sdk";

const tx = await ua.createUniversalTransaction({
  chainId: CHAIN_ID.ARBITRUM_MAINNET_ONE,
  // batched in a single EIP-7702 transaction:
  transactions: [approveUSDC(price), purchase(contentId)],
});

// funds are routed from whatever chain the reader holds USDC on,
// and settle on Arbitrum. No network switch, no gas token, no popup.
await ua.sendTransaction(tx, signature, authorizations);`;

const EMBED = `<!-- drop an unlock button into any page -->
<script src="https://tollgate.xyz/embed.js" async></script>

<tollgate-unlock
  content="0x9a1d2c3b…e8f9"
  price="50">
  Read the rest · 50¢
</tollgate-unlock>`;

const AGENT = `// an AI agent buys a single article, programmatically (x402)
const res = await fetch("https://tollgate.xyz/api/agent/0x9a1d…", {
  headers: { "payment-payer": agent.address },
});

if (res.status === 402) {
  const { accepts } = await res.json();   // USDC on Arbitrum, exact amount
  const signature = await agent.payWithUniversalAccount(accepts[0]);

  const paid = await fetch(res.url, {
    headers: {
      "payment-payer": agent.address,
      "payment-signature": signature,
    },
  });
  const { markdown } = await paid.json(); // the full piece, ready to read
}`;

export default function BuildPage() {
  return (
    <main>
      <Masthead />

      <section className="mx-auto max-w-4xl px-5 pt-16 pb-12">
        <div className="kicker">For builders</div>
        <h1 className="display mt-4 text-[clamp(2.6rem,6vw,4rem)] text-ink">
          Put a tollgate on
          <br />
          anything you publish.
        </h1>
        <p className="mt-6 max-w-2xl text-[1.2rem] leading-relaxed text-ink-soft">
          Tollgate is an open pay-per-unlock protocol. One verified contract on
          Arbitrum, one dependency-free SDK. Your readers pay with a tap from a
          balance they already hold; you read entitlement straight from chain.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="https://arbiscan.io/address/0x4d321a3ca567224fd3667b570dba458fc4262651#code"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-ink/25 px-5 py-2.5 font-mono text-[0.74rem] uppercase tracking-[0.12em] text-ink transition hover:border-ink/50"
          >
            The contract ↗
          </a>
          <Link
            href="/studio"
            className="rounded-full bg-ink px-5 py-2.5 font-mono text-[0.74rem] uppercase tracking-[0.12em] text-paper transition hover:bg-vermilion"
          >
            Open the studio
          </Link>
        </div>
      </section>

      {/* how it works */}
      <section className="border-y border-ink/15 bg-paper-2/40">
        <div className="mx-auto grid max-w-4xl gap-px px-5 py-6 sm:grid-cols-4">
          <Flow n="1" t="402">
            A reader hits a gated route. The server answers{" "}
            <em className="not-italic text-vermilion-deep">Payment Required</em>{" "}
            with a quote.
          </Flow>
          <Flow n="2" t="Settle">
            Their Universal Account routes USDC from any chain and settles on
            Arbitrum, gas abstracted.
          </Flow>
          <Flow n="3" t="Verify">
            The server reads{" "}
            <code className="font-mono text-[0.85em]">hasAccess</code> from the
            registry — entitlement is settlement.
          </Flow>
          <Flow n="4" t="Release">
            Only now does the gated content leave the server. The paywall can&rsquo;t
            be picked client-side.
          </Flow>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-14">
        <Block
          kicker="Server"
          title="Protect a route"
          body="Wrap any handler. The body never ships until the registry says this reader paid."
          code={ROUTE}
        />
        <Block
          kicker="Client"
          title="Pay with a Universal Account"
          body="EIP-7702 mode turns the reader's account into a smart account in place. The approve and the purchase ride one transaction; liquidity and gas are abstracted."
          code={PAY}
        />
        <Block
          kicker="Anywhere"
          title="Or just drop in a button"
          body="No framework? Paste two lines. The web component handles login, settlement, and unlock."
          code={EMBED}
        />
        <Block
          kicker="Agents"
          title="Sell to machines, too"
          body="The same gate answers HTTP 402 in x402 form, so an autonomous agent can buy a single article and read it — no account, no subscription, one settlement on Arbitrum."
          code={AGENT}
        />
      </section>

      {/* contract surface */}
      <section className="border-t border-ink/15 bg-paper-2/30">
        <div className="mx-auto max-w-4xl px-5 py-14">
          <div className="kicker mb-3">The protocol</div>
          <h2 className="display text-[2rem] text-ink">
            TollgateAccessRegistry
          </h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Non-custodial. Funds never rest in the contract — a purchase forwards
            USDC straight to the creator. Stats and entitlement live on-chain so
            anyone can read them with no indexer.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Fn sig="registerContent(id, price)" note="creators list a piece" />
            <Fn sig="purchase(id)" note="reader unlocks, paid in USDC" />
            <Fn sig="hasAccess(reader, id) → bool" note="the gate reads this" />
            <Fn sig="getCreatorContents(creator)" note="powers the studio" />
            <Fn sig="tip(creator, amount)" note="no-fee creator tips" />
            <Fn sig="creatorEarnings(creator)" note="lifetime, on-chain" />
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/15">
        <div className="mx-auto max-w-4xl px-5 py-10 text-center">
          <span className="font-mono text-[0.78rem] text-ink-faint">
            Settled on Arbitrum · Universal Accounts · EIP-7702 · USDC
          </span>
        </div>
      </footer>
    </main>
  );
}

function Block({
  kicker,
  title,
  body,
  code,
}: {
  kicker: string;
  title: string;
  body: string;
  code: string;
}) {
  return (
    <div className="mb-12">
      <div className="mb-4 max-w-2xl">
        <div className="kicker">{kicker}</div>
        <h3 className="display mt-2 text-[1.7rem] text-ink">{title}</h3>
        <p className="mt-2 text-[0.98rem] leading-relaxed text-ink-soft">
          {body}
        </p>
      </div>
      <pre className="tg-code overflow-x-auto rounded-xl border border-ink/15 bg-[#1c1814] p-5 font-mono text-[0.78rem] leading-relaxed text-[#e9dfce] shadow-[var(--shadow-lift)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Flow({
  n,
  t,
  children,
}: {
  n: string;
  t: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-2 py-4">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-vermilion/10 font-mono text-[0.72rem] text-vermilion-deep">
          {n}
        </span>
        <span className="font-mono text-[0.78rem] uppercase tracking-[0.12em] text-ink">
          {t}
        </span>
      </div>
      <p className="mt-2 text-[0.86rem] leading-relaxed text-ink-soft">
        {children}
      </p>
    </div>
  );
}

function Fn({ sig, note }: { sig: string; note: string }) {
  return (
    <div className="rounded-lg border border-ink/12 bg-paper p-3.5">
      <code className="font-mono text-[0.82rem] text-ink">{sig}</code>
      <div className="mt-1 text-[0.76rem] text-ink-faint">{note}</div>
    </div>
  );
}
