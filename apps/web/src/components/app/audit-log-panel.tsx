"use client";

import { AUDIT_ACTION_LABELS, type AuditAction } from "@/lib/audit";
import { Download } from "lucide-react";
import Link from "next/link";

interface AuditRow {
  id: number;
  action: string;
  summary: string;
  created_at: string;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
}

export function AuditLogPanel({ entries }: { entries: AuditRow[] }) {
  if (!entries.length) {
    return (
      <div className="rounded-xl border border-card bg-card p-6">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h3 className="font-semibold">Registro de actividad</h3>
          <Link
            href="/api/reports/audit"
            className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </Link>
        </div>
        <p className="text-sm text-muted">Sin actividad registrada aún.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-card bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-card flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Registro de actividad</h3>
          <p className="text-xs text-muted mt-1">Últimas 50 acciones en la organización.</p>
        </div>
        <Link
          href="/api/reports/audit"
          className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar CSV
        </Link>
      </div>
      <div className="max-h-96 overflow-auto divide-y divide-[var(--card-border)]">
        {entries.map((e) => {
          const profile = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
          const actionLabel =
            AUDIT_ACTION_LABELS[e.action as AuditAction] ?? e.action;
          return (
            <div key={e.id} className="px-5 py-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{e.summary}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {actionLabel}
                    {profile?.full_name ? ` · ${profile.full_name}` : ""}
                  </p>
                </div>
                <time className="text-xs text-muted shrink-0">
                  {new Date(e.created_at).toLocaleString("es-ES")}
                </time>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
