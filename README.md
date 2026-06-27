# Tollgate

**Read what's worth paying for.** Tollgate is a pay-per-unlock reader where paying for a single
story feels like nothing — sign in with an email, tap once, and the rest of the article appears.
No wallet, no seed phrase, no gas, no popup. The crypto is invisible; the writing is not.

Underneath the quiet surface, every unlock is a real cross-chain micropayment: a **Particle
Universal Account in EIP-7702 mode** pulls the reader's balance from whatever chain it sits on and
settles the payment in USDC on **Arbitrum**, and the server releases the gated text only after it
reads the reader's entitlement back from chain. The hard parts — bridging, gas, account
abstraction — are the maker's burden, never the reader's.

Tollgate is also a **protocol**: one verified contract, one dependency-free SDK, and an x402 rail,
so any writer or app can put a tollgate on what they publish.

---

## The one-tap flow

1. **Sign in** with email or Google. A secure embedded account is created in the background — no
   extension, no recovery phrase.
2. **Tap unlock.** The server answers `402 Payment Required` with a quote. The reader's Universal
   Account batches an `approve` + `purchase` into a single EIP-7702 transaction, routes USDC from
   any chain, and settles on Arbitrum — gas abstracted, one signature.
3. **Read.** The server reads `hasAccess(reader, contentId)` from the registry and only then
   releases the paragraphs. A receipt waits, quietly, for the one time you want to look.

## Why it's built this way

- **The paywall is enforced by settlement, not by hiding a `<div>`.** Paid paragraphs live in a
  server-only module and never ship to the browser; the gate releases them only after on-chain
  entitlement checks out. A technical reader can't pick the lock from the client.
- **The reader never sees a chain.** Unified balance, cross-chain routing, gas sponsorship and the
  EIP-7702 account upgrade all happen behind one tap. Adoption is a measure of disappearance.
- **Non-custodial.** A purchase forwards USDC straight to the creator (minus an optional protocol
  fee). Funds never rest in the contract; earnings settle to the creator instantly.

## What's in here

| Surface | Path | What it is |
|---|---|---|
| The Stand | `/` | The newsstand — featured piece, a live unlocks ticker, the catalogue |
| Reader | `/read/[slug]` | The article + the invisible-crypto paywall and receipt |
| Studio | `/studio` | Creator dashboard — earnings, unlocks, revenue, instant payout, publishing |
| Account | `/account` | Reader's library, receipts, and Universal-Account funds (top-up / withdraw) |
| Build | `/build` | Developer docs — drop a tollgate onto anything you publish |
| Gate | `/api/content/[id]` | The server-enforced 402 paywall |
| Agent rail | `/api/agent/[id]` | x402 endpoint so an AI agent can pay-per-read |

## Live on Arbitrum One

- **TollgateAccessRegistry** — [`0x4d321A3Ca567224fD3667B570Dba458fc4262651`](https://arbiscan.io/address/0x4d321a3ca567224fd3667b570dba458fc4262651#code) (verified)
- **A real unlock** — an EIP-7702 **Type-4** transaction with an `authorizationList`, settling a
  cross-chain USDC micropayment on Arbitrum:
  [`0xe47e1709…1b07b0`](https://arbiscan.io/tx/0xe47e170908660a3b4200eb673ee850054e5ddd85ab3191a1846061c54f1b07b0).
  The reader's balance was sourced from Base and landed on Arbitrum; the gate read `hasAccess`
  on-chain and released the page.

## The protocol — `TollgateAccessRegistry`

A small, audited-style Solidity contract on Arbitrum One. Non-custodial, with enough on-chain
bookkeeping that dashboards render straight from chain state with no indexer.

- `registerContent(id, price)` — a creator lists a piece
- `purchase(id)` — a reader unlocks it, paying in USDC
- `hasAccess(reader, id) → bool` — the gate reads this
- `getCreatorContents(creator)` — powers the studio
- `tip(creator, amount)` — no-fee creator tips
- `creatorEarnings(creator)` — lifetime, on-chain

Tested with Foundry (27 tests incl. fuzzing of the fee math). See [`contracts/`](contracts).

## Tech

- **Next.js 15 / React 19 / TypeScript / Tailwind 4**
- **Particle Universal Accounts SDK** (EIP-7702 mode) + **Privy** embedded wallets for email/social login
- **USDC on Arbitrum One**, settled via the Universal Account
- **Foundry** (Solidity) for the registry
- **`@tollgate/sdk`** — dependency-free; reads `hasAccess` over a raw `eth_call`

## Run it

```bash
pnpm install
cp .env.example .env.local   # add your Particle + Privy keys (see the file)
pnpm dev                     # http://localhost:3000
```

The app runs end-to-end without keys (settlement is simulated locally) so you can click the whole
flow. Add the keys to use real Universal Accounts.

### Contracts

```bash
cd contracts
forge test                   # 27 passing
# deploy + verify on Arbitrum One:
forge script script/Deploy.s.sol:Deploy --rpc-url arbitrum --private-key $PRIVATE_KEY --broadcast --verify
```

Set `NEXT_PUBLIC_REGISTRY_ADDRESS` to the deployed address and the gate switches from the local
proof to reading `hasAccess` on-chain — no other code changes.

## License

MIT — see [LICENSE](LICENSE).
