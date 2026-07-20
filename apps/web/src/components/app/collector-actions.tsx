"use client";

import { OwnerGate } from "@/components/app/role-context";
import { StatusBadge } from "@/components/app/status-badge";
import { createClient } from "@/lib/supabase/client";
import { Loader2, RotateCw, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CollectorActionsProps {
  collectorId: string;
  status: string;
}

export function CollectorActions({ collectorId, status }: CollectorActionsProps) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState<"rotate" | "revoke" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function callFunction(path: string, action: "rotate" | "revoke") {
    setLoading(action);
    setMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ collector_id: collectorId }),
      },
    );
    const data = await res.json();
    setLoading(null);

    if (!res.ok) {
      setMessage(data.error ?? "Error");
      return;
    }

    setMessage(data.message ?? "Operación completada");
    router.refresh();
  }

  if (status === "revoked") {
    return (
      <p className="text-sm text-muted">Este collector está revocado y no monitoriza.</p>
    );
  }

  return (
    <OwnerGate
      fallback={
        <p className="text-sm text-muted">
          Solo el propietario puede rotar tokens o revocar collectors.
        </p>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!!loading}
            onClick={() => callFunction("collectors-rotate-token", "rotate")}
            className="inline-flex items-center gap-2 rounded-lg border border-card px-4 py-2 text-sm hover:bg-card disabled:opacity-50"
          >
            {loading === "rotate" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            Rotar token
          </button>
          <button
            type="button"
            disabled={!!loading}
            onClick={() => {
              if (confirm("¿Revocar este collector? Dejará de enviar datos.")) {
                callFunction("collectors-revoke", "revoke");
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 text-red-400 px-4 py-2 text-sm hover:bg-red-500/10 disabled:opacity-50"
          >
            {loading === "revoke" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldOff className="h-4 w-4" />
            )}
            Revocar collector
          </button>
        </div>
        {message && <p className="text-sm text-muted">{message}</p>}
      </div>
    </OwnerGate>
  );
}

export function CollectorDetailHeader({
  name,
  status,
  venueName,
  firmware,
  lastSeen,
}: {
  name: string;
  status: string;
  venueName?: string;
  firmware?: string | null;
  lastSeen?: string | null;
}) {
  return (
    <div>
      <Link href="/app/collectors" className="text-sm text-muted hover:text-white">
        ← Collectors
      </Link>
      <div className="flex items-start justify-between gap-4 mt-2">
        <div>
          <h2 className="text-2xl font-bold">{name}</h2>
          <p className="text-muted text-sm mt-1">
            {venueName ?? "Sin venue"} · v{firmware ?? "?"}
          </p>
          {lastSeen && (
            <p className="text-xs text-muted mt-1">
              Última conexión: {new Date(lastSeen).toLocaleString("es-ES")}
            </p>
          )}
        </div>
        <StatusBadge status={status === "active" ? "online" : status} />
      </div>
    </div>
  );
}
