"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Supabase OAuth sometimes lands on Site URL (/) with ?code= or error params
 * instead of /auth/callback. Forward to the correct routes.
 */
export function AuthOAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);

    const code = url.searchParams.get("code");
    if (code) {
      const next = url.searchParams.get("next") ?? "/app";
      router.replace(
        `/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`,
      );
      return;
    }

    const fromQuery =
      url.searchParams.get("error_description") ??
      url.searchParams.get("error");

    let fromHash: string | null = null;
    if (url.hash.length > 1) {
      const hashParams = new URLSearchParams(url.hash.slice(1));
      const hashCode = hashParams.get("code");
      if (hashCode) {
        router.replace(
          `/auth/callback?code=${encodeURIComponent(hashCode)}&next=/app`,
        );
        return;
      }
      fromHash =
        hashParams.get("error_description") ?? hashParams.get("error");
    }

    const message = fromQuery ?? fromHash;
    if (!message) return;

    router.replace(`/login?error=${encodeURIComponent(message)}`);
  }, [router]);

  return null;
}
