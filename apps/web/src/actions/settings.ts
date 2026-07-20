"use server";

import { logAudit } from "@/lib/audit";
import { ALERT_RULES, type AlertRuleKey } from "@/lib/alert-rules";
import { parsePlan, planLimitMessage, PLAN_LIMITS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { supabase, userId: user.id, orgId: profile.organization_id as string, role: profile.role };
}

export async function updateOrganizationSettings(input: { name: string; timezone: string }) {
  const actor = await getActor();
  if (!actor) return { error: "No autenticado" };
  if (actor.role === "viewer") return { error: "Sin permiso" };

  const { error } = await actor.supabase
    .from("organizations")
    .update({ name: input.name.trim(), timezone: input.timezone })
    .eq("id", actor.orgId);

  if (error) return { error: error.message };

  await logAudit(actor.supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: "settings.org",
    summary: `Organización actualizada: ${input.name.trim()}`,
    metadata: { timezone: input.timezone },
  });

  revalidatePath("/app/settings");
  return { ok: true };
}

export interface NotificationSettingsInput {
  notification_email: string | null;
  alerts_email_enabled: boolean;
  lamp_hours_warning: number;
  pre_opening_alert_minutes: number;
  metrics_retention_days: number;
  sla_report_enabled: boolean;
  sla_target_pct: number;
  sla_report_day: number;
  webhook_url: string | null;
  webhook_enabled: boolean;
  webhook_min_severity: "info" | "warning" | "critical";
}

export async function updateNotificationSettings(input: NotificationSettingsInput) {
  const actor = await getActor();
  if (!actor) return { error: "No autenticado" };
  if (actor.role === "viewer") return { error: "Sin permiso" };

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("plan")
    .eq("id", actor.orgId)
    .single();

  const plan = parsePlan(org?.plan);
  const maxRetention = PLAN_LIMITS[plan].maxRetentionDays;
  const retentionDays = Math.min(input.metrics_retention_days, maxRetention);

  const { error } = await actor.supabase
    .from("organizations")
    .update({
      notification_email: input.notification_email,
      alerts_email_enabled: input.alerts_email_enabled,
      lamp_hours_warning: input.lamp_hours_warning,
      pre_opening_alert_minutes: input.pre_opening_alert_minutes,
      metrics_retention_days: retentionDays,
      sla_report_enabled: input.sla_report_enabled,
      sla_target_pct: input.sla_target_pct,
      sla_report_day: input.sla_report_day,
      webhook_url: input.webhook_url,
      webhook_enabled: input.webhook_enabled,
      webhook_min_severity: input.webhook_min_severity,
    })
    .eq("id", actor.orgId);

  if (error) return { error: error.message };

  await logAudit(actor.supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: "settings.notifications",
    summary: "Configuración de notificaciones actualizada",
    metadata: {
      email_enabled: input.alerts_email_enabled,
      webhook_enabled: input.webhook_enabled,
      retention_days: retentionDays,
    },
  });

  revalidatePath("/app/settings");
  return {
    ok: true,
    retentionCapped: retentionDays < input.metrics_retention_days,
    maxRetention,
  };
}

export async function toggleAlertRule(ruleId: string, enabled: boolean) {
  const actor = await getActor();
  if (!actor) return { error: "No autenticado" };
  if (actor.role === "viewer") return { error: "Sin permiso" };

  const { data: rule } = await actor.supabase
    .from("alert_rules")
    .select("rule_key")
    .eq("id", ruleId)
    .eq("organization_id", actor.orgId)
    .single();

  if (!rule) return { error: "Regla no encontrada" };

  const { error } = await actor.supabase
    .from("alert_rules")
    .update({ enabled })
    .eq("id", ruleId);

  if (error) return { error: error.message };

  const meta = ALERT_RULES[rule.rule_key as AlertRuleKey];
  await logAudit(actor.supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: "settings.alert_rule",
    entityType: "alert_rule",
    entityId: ruleId,
    summary: `${meta?.label ?? rule.rule_key}: ${enabled ? "activada" : "desactivada"}`,
  });

  return { ok: true };
}

export async function saveOpeningHours(venueId: string, venueName: string, hours: Array<{ day_of_week: number; opens_at: string; closes_at: string }>) {
  const actor = await getActor();
  if (!actor) return { error: "No autenticado" };
  if (actor.role === "viewer") return { error: "Sin permiso" };

  await actor.supabase.from("opening_hours").delete().eq("venue_id", venueId);

  const rows = hours.map((h) => ({
    organization_id: actor.orgId,
    venue_id: venueId,
    day_of_week: h.day_of_week,
    opens_at: h.opens_at,
    closes_at: h.closes_at,
  }));

  const { error } = await actor.supabase.from("opening_hours").insert(rows);
  if (error) return { error: error.message };

  await logAudit(actor.supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: "settings.opening_hours",
    entityType: "venue",
    entityId: venueId,
    summary: `Horarios actualizados: ${venueName}`,
  });

  revalidatePath("/app/settings");
  return { ok: true };
}

export async function getOrgPlanInfo() {
  const actor = await getActor();
  if (!actor) return null;

  const { data: org } = await actor.supabase
    .from("organizations")
    .select("plan, metrics_retention_days")
    .eq("id", actor.orgId)
    .single();

  const plan = parsePlan(org?.plan);
  const limits = PLAN_LIMITS[plan];

  const [{ count: deviceCount }, { count: collectorCount }] = await Promise.all([
    actor.supabase
      .from("av_devices")
      .select("id", { count: "exact", head: true })
      .eq("enabled", true),
    actor.supabase
      .from("collectors")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .not("organization_id", "is", null),
  ]);

  return {
    plan,
    limits,
    deviceCount: deviceCount ?? 0,
    collectorCount: collectorCount ?? 0,
    retentionDays: org?.metrics_retention_days ?? limits.maxRetentionDays,
    planLimitMessage,
  };
}
