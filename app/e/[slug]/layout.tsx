"use client";
import { useParams, usePathname } from "next/navigation";
import { PhoneProvider, usePhone } from "@/components/lma/phone";
import { PhoneTabBar } from "@/components/lma/ui";

export default function PhoneLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  return (
    <PhoneProvider slug={slug}>
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
  const base = `/e/${slug}`;
  const active =
    path === base || path === `${base}/waiting` ? "event" : path === `${base}/rules` ? "rules" : path.startsWith(`${base}/characters`) ? "characters" : null;
  if (!active) return null;
  if (active === "event" && path === base && me.role !== "submitter") return null;
  return <PhoneTabBar slug={slug} role={me.role} active={active} />;
}
