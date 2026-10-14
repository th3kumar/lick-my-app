"use client";
// Holding page for Phase 2 screens (L1 Live control, L2 Results).
import { Icon } from "@/components/sundial";
import type { AdminTab } from "./admin";
import { Push } from "./ui";

export function PhaseTwo({ tab, title, icon, body }: { tab: AdminTab; title: string; icon: string; body: string }) {
  return (
    <>
      <Push>
        <main className="lma-main">
          <div className="lma-page-head"><h1 className="sd-title-screen">{title}</h1></div>
          <div className="lma-empty">
            <Icon name={icon} size={24} />
            <div className="lma-empty__title">Coming next!</div>
            <div className="lma-empty__body">{body}</div>
          </div>
        </main>
      </Push>
    </>
  );
}
