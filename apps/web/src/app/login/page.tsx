"use client";

import { createClient } from "@/lib/supabase/client";
import { Monitor } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/app";
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function signInWithGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${redirect}`,
      },
    });
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="flex items-center justify-center gap-2 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
          <Monitor className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-semibold">Observal</span>
      </Link>

      <div className="rounded-xl border border-card bg-card p-8">
        <h1 className="text-2xl font-bold text-center">Accede a tu plataforma</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Monitoriza el AV de tu museo desde cualquier lugar.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 text-center">
            Error al iniciar sesión. Inténtalo de nuevo.
          </p>
        )}

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-8 w-full flex items-center justify-center gap-3 rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 text-sm font-medium hover:bg-[#111827] transition-colors disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? "Redirigiendo…" : "Continuar con Google"}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Al continuar aceptas los términos de uso de Observal.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.1),_transparent_60%)]">
      <Suspense fallback={<div className="min-h-screen" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
