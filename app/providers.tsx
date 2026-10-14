"use client";
import { MotionConfig } from "motion/react";
import { NavProvider } from "@/components/lma/nav";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <NavProvider>{children}</NavProvider>
    </MotionConfig>
  );
}
