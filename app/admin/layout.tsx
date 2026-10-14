"use client";
import { Suspense } from "react";
import { AdminProvider } from "@/components/lma/admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // static export: ?id= is only known in the browser
  return (
    <Suspense fallback={<div className="lma-admin" aria-busy="true" />}>
      <AdminProvider>{children}</AdminProvider>
    </Suspense>
  );
}
