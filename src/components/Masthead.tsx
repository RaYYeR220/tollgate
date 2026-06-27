"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccess } from "@/lib/access";
import { SignInSheet } from "./SignInSheet";

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function Masthead() {
  const { session, balanceCents, signOut, ready, realMode, startLogin } =
    useAccess();
  const [signInOpen, setSignInOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="group flex items-center gap-2.5">
          <Seal />
          <span className="display text-[1.45rem] font-semibold tracking-[-0.01em] text-ink">
            Tollgate
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <NavLink href="/">The Stand</NavLink>
          <NavLink href="/studio">Studio</NavLink>
          <NavLink href="/build">Build</NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {!ready ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-ink/10" />
          ) : session ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-full border border-ink/15 bg-paper-2/70 py-1.5 pl-3 pr-1.5 transition hover:border-ink/30"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full bg-gold"
                  aria-hidden
                />
                <span className="font-mono text-[0.8rem] text-ink">
                  {fmt(balanceCents)}
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-ink font-mono text-[0.72rem] uppercase text-paper">
                  {session.email[0] ?? "r"}
                </span>
              </button>

              {menuOpen && (
                <>
                  <button
                    aria-label="Close menu"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-64 anim-fadeup rounded-xl border border-ink/15 bg-paper p-4 shadow-[0_24px_60px_-28px_#1a1613aa]">
                    <div className="label-mono mb-1">Signed in</div>
                    <div className="mb-3 truncate text-[0.92rem] text-ink">
                      {session.email}
                    </div>
                    <div className="rounded-lg bg-paper-2/70 p-3">
                      <div className="label-mono mb-1">Universal balance</div>
                      <div className="font-mono text-[1.1rem] text-ink">
                        {fmt(balanceCents)}
                      </div>
                      <div className="mt-1 text-[0.74rem] text-ink-faint">
                        Pooled across your chains · ready to spend
                      </div>
                    </div>
                    <div className="mt-3 grid gap-0.5">
                      <MenuLink href="/account" onClick={() => setMenuOpen(false)}>
                        Your library
                      </MenuLink>
                      <MenuLink href="/studio" onClick={() => setMenuOpen(false)}>
                        Creator studio
                      </MenuLink>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3">
                      <span className="font-mono text-[0.74rem] text-ink-faint">
                        {short(session.address)}
                      </span>
                      <button
                        onClick={() => {
                          signOut();
                          setMenuOpen(false);
                        }}
                        className="font-mono text-[0.74rem] uppercase tracking-[0.12em] text-vermilion-deep hover:underline"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => (realMode ? startLogin() : setSignInOpen(true))}
              className="rounded-full bg-ink px-5 py-2 font-mono text-[0.74rem] uppercase tracking-[0.14em] text-paper transition hover:bg-vermilion"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {!realMode && (
        <SignInSheet open={signInOpen} onClose={() => setSignInOpen(false)} />
      )}
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ink-soft transition hover:text-vermilion-deep"
    >
      {children}
    </Link>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="-mx-2 rounded-md px-2 py-1.5 text-[0.9rem] text-ink transition hover:bg-paper-2"
    >
      {children}
    </Link>
  );
}

/** A small letterpress seal — the toll mark. */
function Seal() {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full border-[1.5px] border-vermilion/70 bg-vermilion/5">
      <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 1.2 9.9 5l4.2.5-3.1 2.9.9 4.1L8 10.6 4.1 12.5l.9-4.1L1.9 5.5 6.1 5 8 1.2Z"
          fill="none"
          stroke="var(--color-vermilion)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
