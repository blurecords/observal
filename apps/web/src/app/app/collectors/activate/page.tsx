"use client";

import { createClient } from "@/lib/supabase/client";
import { formatPairingCode } from "@/lib/utils";
import { CheckCircle2, Loader2, Radio } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ActivateCollectorPage() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [venueName, setVenueName] = useState("");
  const [collectorName, setCollectorName] = useState("Observal Collector");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setError("Sesión expirada. Vuelve a iniciar sesión.");
      setLoading(false);
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/collectors-claim`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          pairing_code: code,
          venue_name: venueName || "Mi museo",
          collector_name: collectorName,
        }),
      },
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al activar el collector");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/app/collectors"), 2500);
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Collector activado</h2>
        <p className="text-muted mt-2">
          La Pi recibirá la configuración en unos segundos.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Activar collector</h2>
        <p className="text-muted mt-1">
          Introduce el código de la etiqueta de la Raspberry Pi.
        </p>
      </div>

      <div className="rounded-xl border border-card bg-card p-5 space-y-3 text-sm">
        <div className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold">
            1
          </span>
          <p>Conecta la Pi al router del museo por Ethernet.</p>
        </div>
        <div className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold">
            2
          </span>
          <p>Enciende la Pi y espera 30 segundos.</p>
        </div>
        <div className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold">
            3
          </span>
          <p>Introduce el código de la etiqueta abajo.</p>
        </div>
      </div>

      <form onSubmit={handleActivate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Código de activación
          </label>
          <div className="relative">
            <Radio className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(formatPairingCode(e.target.value))}
              placeholder="XXXX-XXXX"
              className="w-full rounded-lg border border-card bg-[#0a0f1a] pl-11 pr-4 py-3 font-mono text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-600"
              maxLength={9}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Nombre del museo / venue
          </label>
          <input
            type="text"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="Museo de Arte Contemporáneo"
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Nombre del collector
          </label>
          <input
            type="text"
            value={collectorName}
            onChange={(e) => setCollectorName(e.target.value)}
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || code.length < 8}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Activando…
            </>
          ) : (
            "Activar collector"
          )}
        </button>
      </form>

      <Link href="/app/collectors" className="block text-center text-sm text-muted hover:text-white">
        ← Volver a collectors
      </Link>
    </div>
  );
}
