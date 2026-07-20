import Link from "next/link";
import { AlertTriangle } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10",
  warning: "text-yellow-400 bg-yellow-500/10",
  info: "text-blue-400 bg-blue-500/10",
};

interface RecentAlert {
  id: string;
  title: string;
  severity: string;
  created_at: string;
}

export function DashboardRecentAlerts({ alerts }: { alerts: RecentAlert[] }) {
  if (!alerts.length) return null;

  return (
    <div className="rounded-xl border border-card bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-card flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          Alertas recientes
        </h3>
        <Link href="/app/alerts" className="text-sm text-blue-400 hover:underline">
          Ver todas
        </Link>
      </div>
      <div className="divide-y divide-[var(--card-border)]">
        {alerts.map((a) => (
          <Link
            key={a.id}
            href="/app/alerts"
            className="flex items-start justify-between gap-4 px-5 py-3 hover:bg-[#0a0f1a]/50"
          >
            <div>
              <p className="text-sm font-medium">{a.title}</p>
              <p className="text-xs text-muted mt-0.5">
                {new Date(a.created_at).toLocaleString("es-ES")}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                SEVERITY_COLORS[a.severity] ?? SEVERITY_COLORS.info
              }`}
            >
              {a.severity}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
