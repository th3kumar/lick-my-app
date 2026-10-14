"use client";
import { AdminProvider } from "@/components/lma/admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminProvider>{children}</AdminProvider>;
}
