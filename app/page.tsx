"use client";
// Static hosting has no server redirects: send the root to the admin.
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { routes } from "@/lib/lick-my-app/routes";

export default function Home() {
  const router = useRouter();
  useEffect(() => router.replace(routes.admin()), [router]);
  return null;
}
