"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Supabase OAuth errors sometimes land on Site URL (/) in the query string or hash.
 * Forward them to /login so the user sees a readable message.
 */
export function AuthErrorRedirect() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const fromQuery =
      url.searchParams.get("error_description") ??
      url.searchParams.get("error");

    let fromHash: string | null = null;
    if (url.hash.length > 1) {
      const hashParams = new URLSearchParams(url.hash.slice(1));
      fromHash =
        hashParams.get("error_description") ?? hashParams.get("error");
    }

    const message = fromQuery ?? fromHash;
    if (!message) return;

    router.replace(`/login?error=${encodeURIComponent(message)}`);
  }, [router]);

  return null;
}
