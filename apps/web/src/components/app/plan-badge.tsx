"use client";

import { PLAN_LIMITS, type OrgPlan } from "@/lib/plans";

export function PlanBadge({ plan }: { plan: OrgPlan }) {
  const limits = PLAN_LIMITS[plan];
  const colors: Record<OrgPlan, string> = {
    starter: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    pro: "bg-blue-600/20 text-blue-300 border-blue-600/30",
    enterprise: "bg-purple-600/20 text-purple-300 border-purple-600/30",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors[plan]}`}
    >
      Plan {limits.label}
    </span>
  );
}

export function PlanUsage({
  plan,
  deviceCount,
  collectorCount,
}: {
  plan: OrgPlan;
  deviceCount: number;
  collectorCount: number;
}) {
  const limits = PLAN_LIMITS[plan];

  return (
    <div className="rounded-xl border border-card bg-card p-6 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-semibold">Tu plan</h3>
        <PlanBadge plan={plan} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-[var(--card-border)] p-3">
          <p className="text-muted text-xs">Collectors</p>
          <p className="font-medium mt-1">
            {collectorCount}
            {limits.maxCollectors !== null ? ` / ${limits.maxCollectors}` : " · ilimitados"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] p-3">
          <p className="text-muted text-xs">Equipos activos</p>
          <p className="font-medium mt-1">
            {deviceCount}
            {limits.maxDevices !== null ? ` / ${limits.maxDevices}` : " · ilimitados"}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted">
        Retención máxima: {limits.maxRetentionDays} días.
        {plan === "starter" && " Contacta ventas para ampliar a Pro."}
      </p>
    </div>
  );
}
