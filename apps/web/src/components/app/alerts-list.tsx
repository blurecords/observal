"use client";

import { ALERT_RULES, type AlertRuleKey } from "@/lib/alert-rules";
import { relationName } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Check, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface AlertRow {
  id: string;
  title: string;
  message: string | null;
  severity: string;
  rule_key: string | null;
  triggered_at: string;
  resolved: boolean;
  acknowledged: boolean;
  av_devices: { name: string } | { name: string }[] | null;
}

const severityColors: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-red-500/20 text-red-400",
};

export function AlertsList({ alerts }: { alerts: AlertRow[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const [severity, setSeverity] = useState<string>("all");

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filter === "open" && a.resolved) return false;
      if (filter === "resolved" && !a.resolved) return false;
      if (severity !== "all" && a.severity !== severity) return false;
      return true;
    });
  }, [alerts, filter, severity]);

  async function acknowledge(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("alerts")
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user?.id ?? null,
      })
      .eq("id", id);
    router.refresh();
  }

  async function resolve(id: string) {
    await supabase
      .from("alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["open", "all", "resolved"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm border",
              filter === f
                ? "bg-blue-600/20 border-blue-600 text-blue-300"
                : "border-card text-muted hover:text-white",
            )}
          >
            {f === "open" ? "Abiertas" : f === "all" ? "Todas" : "Resueltas"}
          </button>
        ))}
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="rounded-lg border border-card bg-[#0a0f1a] px-3 py-1.5 text-sm ml-auto"
        >
          <option value="all">Todas las severidades</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {!filtered.length ? (
        <div className="rounded-xl border border-dashed border-card p-12 text-center">
          <p className="text-muted">Sin alertas con estos filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className={cn(
                "rounded-xl border border-card bg-card p-5",
                a.resolved && "opacity-60",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{a.title}</p>
                    {a.acknowledged && (
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Eye className="h-3 w-3" /> vista
                      </span>
                    )}
                  </div>
                  {a.message && (
                    <p className="text-sm text-muted mt-1">{a.message}</p>
                  )}
                  <p className="text-xs text-muted mt-2">
                    {relationName(a.av_devices) ?? "Sistema"}
                    {a.rule_key && ALERT_RULES[a.rule_key as AlertRuleKey] && (
                      <> · {ALERT_RULES[a.rule_key as AlertRuleKey].label}</>
                    )}
                    {" · "}
                    {new Date(a.triggered_at).toLocaleString("es-ES")}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full shrink-0 h-fit ${severityColors[a.severity]}`}
                >
                  {a.severity}
                </span>
              </div>

              {!a.resolved && (
                <div className="flex gap-2 mt-4">
                  {!a.acknowledged && (
                    <button
                      type="button"
                      onClick={() => acknowledge(a.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-card px-3 py-1.5 text-xs hover:bg-[#0a0f1a]"
                    >
                      <Eye className="h-3 w-3" />
                      Marcar vista
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => resolve(a.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-green-600/20 text-green-400 px-3 py-1.5 text-xs hover:bg-green-600/30"
                  >
                    <Check className="h-3 w-3" />
                    Resolver
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
