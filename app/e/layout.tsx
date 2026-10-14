"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PhoneProvider, usePhone } from "@/components/lma/phone";
import { PhoneTabBar } from "@/components/lma/ui";
import { samePath } from "@/lib/lick-my-app/routes";

export default function PhoneLayout({ children }: { children: React.ReactNode }) {
  // static export: the query string is only known in the browser
  return (
    <Suspense fallback={<div className="lma-phone" aria-busy="true" />}>
      <WithSlug>{children}</WithSlug>
    </Suspense>
  );
}

function WithSlug({ children }: { children: React.ReactNode }) {
  const slug = useSearchParams().get("s") ?? "";
  return (
    <PhoneProvider key={slug} slug={slug}>
      {children}
      <PhoneChrome />
    </PhoneProvider>
  );
}

/** The floating tab bar lives here so it stays mounted between tabs and the pill morphs (§02). */
function PhoneChrome() {
  const { slug, me, event } = usePhone();
  const path = usePathname();
  if (!me?.role || !event || ["countdown", "reveal", "board", "done"].includes(event.phase)) return null;
  const active =
    samePath(path, "/e") || samePath(path, "/e/waiting") ? "event" : samePath(path, "/e/rules") ? "rules" : path.startsWith("/e/characters") ? "characters" : null;
  if (!active) return null;
  if (active === "event" && samePath(path, "/e") && me.role !== "submitter") return null;
  return <PhoneTabBar slug={slug} role={me.role} active={active} />;
}
