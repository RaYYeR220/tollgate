import type { Metadata } from "next";
import { Masthead } from "@/components/Masthead";
import { StudioView } from "@/components/StudioView";

export const metadata: Metadata = {
  title: "Studio · Tollgate",
  description: "What readers paid for, in real time.",
};

export default function StudioPage() {
  return (
    <main>
      <Masthead />
      <StudioView />
    </main>
  );
}
