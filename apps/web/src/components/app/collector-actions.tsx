"use client";

import { revokeCollector, rotateCollectorToken } from "@/actions/collectors";
import { OwnerGate } from "@/components/app/role-context";
import { StatusBadge } from "@/components/app/status-badge";
import { Loader2, RotateCw, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CollectorActionsProps {
  collectorId: string;
  collectorName: string;
  status: string;
}

export function CollectorActions({
  collectorId,
  collectorName,
  status,
}: CollectorActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"rotate" | "revoke" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRotate() {
    setLoading("rotate");
    setMessage(null);
    const result = await rotateCollectorToken(collectorId, collectorName);
    setLoading(null);
    if ("error" in result && result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(result.message ?? "Token rotado");
    router.refresh();
  }

  async function handleRevoke() {
    if (!confirm("¿Revocar este collector? Dejará de enviar datos.")) return;
    setLoading("revoke");
    setMessage(null);
    const result = await revokeCollector(collectorId, collectorName);
    setLoading(null);
    if ("error" in result && result.error) {
      setMessage(result.error);
      return;
    }
    setMessage(result.message ?? "Collector revocado");
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
            onClick={handleRotate}
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
            onClick={handleRevoke}
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
