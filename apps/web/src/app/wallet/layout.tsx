import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { requireSession } from "@/lib/auth";

export default async function WalletLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return (
    <>
      <div className="pb-28">{children}</div>
      <BottomNav />
    </>
  );
}
