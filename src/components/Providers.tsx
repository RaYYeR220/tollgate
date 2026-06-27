"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { RealWalletBridge } from "@/lib/realwallet";
import { AccessProvider } from "@/lib/access";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const CLIENT_ID = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

/**
 * The full provider stack. When Privy is configured the app gets real
 * email/social embedded wallets feeding a Particle Universal Account; the access
 * layer reads that through RealWalletBridge. Without keys it renders the access
 * layer alone and everything falls back to the local demo.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  if (!APP_ID) {
    return <AccessProvider>{children}</AccessProvider>;
  }

  return (
    <PrivyProvider
      appId={APP_ID}
      clientId={CLIENT_ID}
      config={{
        loginMethods: ["email", "google"],
        embeddedWallets: {
          ethereum: { createOnLogin: "all-users" },
          showWalletUIs: false,
        },
        appearance: {
          theme: "light",
          accentColor: "#d23c18",
          walletChainType: "ethereum-only",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RealWalletBridge>
          <AccessProvider>{children}</AccessProvider>
        </RealWalletBridge>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
