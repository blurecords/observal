export type OrgPlan = "starter" | "pro" | "enterprise";

export interface PlanLimits {
  label: string;
  maxCollectors: number | null;
  maxDevices: number | null;
  maxRetentionDays: number;
}

export const PLAN_LIMITS: Record<OrgPlan, PlanLimits> = {
  starter: {
    label: "Starter",
    maxCollectors: 1,
    maxDevices: 25,
    maxRetentionDays: 7,
  },
  pro: {
    label: "Pro",
    maxCollectors: null,
    maxDevices: null,
    maxRetentionDays: 90,
  },
  enterprise: {
    label: "Enterprise",
    maxCollectors: null,
    maxDevices: null,
    maxRetentionDays: 365,
  },
};

export function parsePlan(value: string | null | undefined): OrgPlan {
  if (value === "pro" || value === "enterprise") return value;
  return "starter";
}

export function planLimitMessage(
  plan: OrgPlan,
  resource: "collectors" | "devices" | "retention",
  current?: number,
): string {
  const limits = PLAN_LIMITS[plan];
  if (resource === "collectors" && limits.maxCollectors !== null) {
    return `El plan ${limits.label} permite ${limits.maxCollectors} collector. Actualiza a Pro para más.`;
  }
  if (resource === "devices" && limits.maxDevices !== null) {
    return `El plan ${limits.label} permite ${limits.maxDevices} equipos (tienes ${current ?? "?"})`;
  }
  if (resource === "retention") {
    return `El plan ${limits.label} permite hasta ${limits.maxRetentionDays} días de retención`;
  }
  return "Límite del plan alcanzado";
}
