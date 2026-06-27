import type { Metadata } from "next";
import { Masthead } from "@/components/Masthead";
import { AccountView } from "@/components/AccountView";

export const metadata: Metadata = {
  title: "Account · Tollgate",
  description: "Your library, receipts, and balance.",
};

export default function AccountPage() {
  return (
    <main>
      <Masthead />
      <AccountView />
    </main>
  );
}
