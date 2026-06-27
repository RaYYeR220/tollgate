"use client";

import { useEffect, useRef, useState } from "react";
import { useAccess } from "@/lib/access";

/**
 * One-tap sign-in. No wallet, no seed phrase — a secure account is created in the
 * background (this becomes a Privy embedded-wallet login). The reader only ever
 * sees "enter your email".
 */
export function SignInSheet({
  open,
  onClose,
  onSignedIn,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn?: () => void;
}) {
  const { signIn } = useAccess();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBusy(false);
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (value: string) => {
    if (busy) return;
    const addr = value.trim() || "reader@tollgate.xyz";
    setBusy(true);
    await signIn(addr);
    setBusy(false);
    onClose();
    onSignedIn?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Tollgate"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] anim-fadeup"
        style={{ animationDuration: "0.25s" }}
      />
      <div className="relative w-full max-w-md anim-fadeup">
        <div className="m-3 rounded-[14px] border border-ink/15 bg-paper p-7 shadow-[0_30px_80px_-30px_#1a1613aa] sm:m-0">
          <div className="kicker mb-3">Members read free of friction</div>
          <h2 className="display text-[2rem] text-ink">
            One tap to read.
          </h2>
          <p className="mt-2 mb-6 text-[0.98rem] leading-relaxed text-ink-soft">
            No wallet. No seed phrase. We spin up a secure account behind the
            scenes so you can pay for a story the way you&rsquo;d buy a coffee.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(email);
            }}
          >
            <label htmlFor="email" className="label-mono mb-2 block">
              Email
            </label>
            <input
              id="email"
              ref={inputRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-ink/20 bg-paper-2/60 px-4 py-3 font-mono text-[0.95rem] text-ink outline-none transition focus:border-vermilion focus:ring-2 focus:ring-vermilion/20"
            />

            <button
              type="submit"
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3.5 font-mono text-[0.82rem] uppercase tracking-[0.14em] text-paper transition hover:bg-vermilion disabled:opacity-70"
            >
              {busy ? (
                <>
                  <span className="spin inline-block h-3.5 w-3.5 rounded-full border-2 border-paper/40 border-t-paper" />
                  Creating your account
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-ink-faint">
            <span className="h-px flex-1 bg-ink/10" />
            <span className="label-mono">or</span>
            <span className="h-px flex-1 bg-ink/10" />
          </div>

          <button
            onClick={() => submit("reader@gmail.com")}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-ink/20 bg-paper px-5 py-3 text-[0.9rem] text-ink transition hover:border-ink/40 disabled:opacity-70"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <p className="mt-5 text-center text-[0.72rem] leading-relaxed text-ink-faint">
            Funded by the balance you already hold across your chains. Settles on
            Arbitrum. You can withdraw any time.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.59C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
