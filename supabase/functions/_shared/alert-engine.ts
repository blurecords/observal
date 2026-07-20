import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export interface OrgSettings {
  id: string;
  timezone: string;
  notification_email: string | null;
  alerts_email_enabled: boolean;
  lamp_hours_warning: number;
  pre_opening_alert_minutes: number;
  webhook_url: string | null;
  webhook_enabled: boolean;
  webhook_min_severity: string;
}

export interface OpeningHourRow {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
}

export interface MuseumContext {
  isOpen: boolean;
  minutesUntilOpen: number | null;
  minutesUntilClose: number | null;
}

export function getMuseumContext(
  timezone: string,
  hours: OpeningHourRow[],
  preOpeningMinutes: number,
): MuseumContext {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const nowMinutes = hour * 60 + minute;

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayMap[weekday] ?? 1;
  const today = hours.find((h) => h.day_of_week === dayOfWeek);

  if (!today) {
    return { isOpen: false, minutesUntilOpen: null, minutesUntilClose: null };
  }

  const parseTime = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const openMin = parseTime(today.opens_at);
  const closeMin = parseTime(today.closes_at);
  const isOpen = nowMinutes >= openMin && nowMinutes < closeMin;
  const minutesUntilOpen =
    nowMinutes < openMin ? openMin - nowMinutes : null;
  const minutesUntilClose =
    isOpen ? closeMin - nowMinutes : null;

  void preOpeningMinutes;

  return { isOpen, minutesUntilOpen, minutesUntilClose };
}

export function isPreOpeningWindow(
  ctx: MuseumContext,
  preOpeningMinutes: number,
): boolean {
  return (
    ctx.minutesUntilOpen !== null &&
    ctx.minutesUntilOpen <= preOpeningMinutes &&
    ctx.minutesUntilOpen > 0
  );
}

async function isRuleEnabled(
  supabase: SupabaseClient,
  orgId: string,
  ruleKey: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("alert_rules")
    .select("enabled")
    .eq("organization_id", orgId)
    .eq("rule_key", ruleKey)
    .maybeSingle();
  return data?.enabled !== false;
}

async function findOpenAlert(
  supabase: SupabaseClient,
  orgId: string,
  ruleKey: string,
  deviceId?: string,
  collectorId?: string,
) {
  let q = supabase
    .from("alerts")
    .select("id")
    .eq("organization_id", orgId)
    .eq("rule_key", ruleKey)
    .eq("resolved", false);

  if (deviceId) q = q.eq("device_id", deviceId);
  if (collectorId) q = q.eq("collector_id", collectorId);

  const { data } = await q.limit(1).maybeSingle();
  return data;
}

async function createAlert(
  supabase: SupabaseClient,
  payload: {
    organization_id: string;
    venue_id?: string | null;
    room_id?: string | null;
    device_id?: string | null;
    collector_id?: string | null;
    severity: string;
    title: string;
    message?: string;
    rule_key: string;
  },
) {
  const existing = await findOpenAlert(
    supabase,
    payload.organization_id,
    payload.rule_key,
    payload.device_id ?? undefined,
    payload.collector_id ?? undefined,
  );
  if (existing) return existing;

  const { data, error } = await supabase
    .from("alerts")
    .insert(payload)
    .select("id, title, message, severity")
    .single();
  if (error) throw error;
  return data;
}

async function resolveAlerts(
  supabase: SupabaseClient,
  orgId: string,
  ruleKey: string,
  deviceId?: string,
  collectorId?: string,
) {
  let q = supabase
    .from("alerts")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("organization_id", orgId)
    .eq("rule_key", ruleKey)
    .eq("resolved", false);

  if (deviceId) q = q.eq("device_id", deviceId);
  if (collectorId) q = q.eq("collector_id", collectorId);

  await q;
}

export async function sendAlertEmail(
  supabase: SupabaseClient,
  org: OrgSettings,
  alert: { id: string; title: string; message?: string | null; severity: string },
) {
  if (!org.alerts_email_enabled || !org.notification_email) return;

  const { data: sent } = await supabase
    .from("alert_notifications")
    .select("id")
    .eq("alert_id", alert.id)
    .eq("channel", "email")
    .maybeSingle();
  if (sent) return;

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("ALERTS_FROM_EMAIL") ?? "Observal <onboarding@resend.dev>";

  if (resendKey) {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [org.notification_email],
        subject: `[Observal ${alert.severity.toUpperCase()}] ${alert.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px">
            <h2 style="color:#1e40af">Observal AV</h2>
            <p><strong>${alert.title}</strong></p>
            <p>${alert.message ?? ""}</p>
            <p style="color:#666;font-size:12px">
              <a href="${Deno.env.get("APP_URL") ?? "https://observal.app"}/app/alerts">
                Ver en Observal
              </a>
            </p>
          </div>
        `,
      }),
    });
    if (!resp.ok) {
      console.error("Resend error:", await resp.text());
      return;
    }
  } else {
    console.log("Email skipped (no RESEND_API_KEY):", alert.title, "→", org.notification_email);
  }

  await supabase.from("alert_notifications").insert({
    alert_id: alert.id,
    channel: "email",
    recipient: org.notification_email,
  });
}

const SEVERITY_RANK: Record<string, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

export async function sendAlertWebhook(
  supabase: SupabaseClient,
  org: OrgSettings,
  alert: { id: string; title: string; message?: string | null; severity: string },
) {
  if (!org.webhook_enabled || !org.webhook_url) return;

  const minRank = SEVERITY_RANK[org.webhook_min_severity] ?? 1;
  const alertRank = SEVERITY_RANK[alert.severity] ?? 0;
  if (alertRank < minRank) return;

  const { data: sent } = await supabase
    .from("alert_notifications")
    .select("id")
    .eq("alert_id", alert.id)
    .eq("channel", "webhook")
    .maybeSingle();
  if (sent) return;

  const appUrl = Deno.env.get("APP_URL") ?? "https://observal.app";
  const alertUrl = `${appUrl}/app/alerts`;
  const isSlack = org.webhook_url.includes("hooks.slack.com");

  const payload = isSlack
    ? {
        text: `[Observal ${alert.severity.toUpperCase()}] ${alert.title}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${alert.title}*\n${alert.message ?? ""}\n<${alertUrl}|Ver en Observal>`,
            },
          },
        ],
      }
    : {
        event: "alert.created",
        severity: alert.severity,
        title: alert.title,
        message: alert.message ?? "",
        url: alertUrl,
      };

  try {
    const resp = await fetch(org.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      console.error("Webhook error:", await resp.text());
      return;
    }
  } catch (err) {
    console.error("Webhook failed:", err);
    return;
  }

  await supabase.from("alert_notifications").insert({
    alert_id: alert.id,
    channel: "webhook",
    recipient: org.webhook_url,
  });
}

export async function notifyAlert(
  supabase: SupabaseClient,
  org: OrgSettings,
  alert: { id: string; title: string; message?: string | null; severity: string },
) {
  await sendAlertEmail(supabase, org, alert);
  await sendAlertWebhook(supabase, org, alert);
}

export async function evaluateIngestAlerts(
  supabase: SupabaseClient,
  collectorId: string,
  organizationId: string,
  heartbeats: Array<{ device_id: string; status: string }>,
  metrics: Array<{ device_id: string; name: string; value: number | string | boolean }>,
) {
  const { data: org } = await supabase
    .from("organizations")
    .select(
      "id, timezone, notification_email, alerts_email_enabled, lamp_hours_warning, pre_opening_alert_minutes, webhook_url, webhook_enabled, webhook_min_severity",
    )
    .eq("id", organizationId)
    .single();

  if (!org) return;

  for (const hb of heartbeats) {
    const { data: device } = await supabase
      .from("av_devices")
      .select("id, name, device_type, venue_id, room_id, critical")
      .eq("id", hb.device_id)
      .single();
    if (!device) continue;

    let openingHours: OpeningHourRow[] = [];
    if (device.venue_id) {
      const { data: hours } = await supabase
        .from("opening_hours")
        .select("day_of_week, opens_at, closes_at")
        .eq("venue_id", device.venue_id);
      openingHours = hours ?? [];
    }

    const ctx = getMuseumContext(
      org.timezone,
      openingHours,
      org.pre_opening_alert_minutes,
    );

    if (hb.status === "offline") {
      const preOpening = isPreOpeningWindow(ctx, org.pre_opening_alert_minutes);
      const criticalRule =
        device.critical &&
        (preOpening || ctx.isOpen) &&
        (await isRuleEnabled(supabase, org.id, "critical_device_offline"));

      if (criticalRule) {
        const alert = await createAlert(supabase, {
          organization_id: org.id,
          venue_id: device.venue_id,
          room_id: device.room_id,
          device_id: device.id,
          collector_id: collectorId,
          severity: "critical",
          rule_key: "critical_device_offline",
          title: `${device.name} offline — exposición en riesgo`,
          message: preOpening
            ? `El equipo crítico no responde y el venue abre en ${ctx.minutesUntilOpen} minutos.`
            : `El equipo crítico no responde durante horario de apertura.`,
        });
        if (alert && "title" in alert) {
          await notifyAlert(supabase, org, alert as { id: string; title: string; message?: string; severity: string });
        }
      } else if (await isRuleEnabled(supabase, org.id, "device_offline")) {
        const severity =
          ctx.isOpen || preOpening ? "warning" : device.critical ? "warning" : "info";
        if (severity !== "info" || device.critical) {
          const alert = await createAlert(supabase, {
            organization_id: org.id,
            venue_id: device.venue_id,
            room_id: device.room_id,
            device_id: device.id,
            collector_id: collectorId,
            severity,
            rule_key: "device_offline",
            title: `${device.name} sin respuesta`,
            message: `Estado: offline`,
          });
          if (alert && "title" in alert) {
            await notifyAlert(supabase, org, alert as { id: string; title: string; message?: string; severity: string });
          }
        }
      }

      if (
        device.device_type === "video_matrix" &&
        (ctx.isOpen || preOpening) &&
        (await isRuleEnabled(supabase, org.id, "matrix_offline"))
      ) {
        const severity = device.critical ? "critical" : "warning";
        const alert = await createAlert(supabase, {
          organization_id: org.id,
          venue_id: device.venue_id,
          room_id: device.room_id,
          device_id: device.id,
          collector_id: collectorId,
          severity,
          rule_key: "matrix_offline",
          title: `Matriz ${device.name} offline`,
          message: preOpening
            ? `La matriz AV no responde y el venue abre en ${ctx.minutesUntilOpen} minutos.`
            : "La matriz AV no responde durante horario activo.",
        });
        if (alert && "title" in alert) {
          await notifyAlert(supabase, org, alert as { id: string; title: string; message?: string; severity: string });
        }
      }
    } else if (hb.status === "online") {
      await resolveAlerts(supabase, org.id, "device_offline", device.id);
      await resolveAlerts(supabase, org.id, "critical_device_offline", device.id);
      await resolveAlerts(supabase, org.id, "matrix_offline", device.id);
    }
  }

  for (const m of metrics) {
    if (
      m.name === "projector.availability" &&
      m.value === "error" &&
      (await isRuleEnabled(supabase, org.id, "projector_availability_error"))
    ) {
      const { data: device } = await supabase
        .from("av_devices")
        .select("id, name, venue_id, room_id")
        .eq("id", m.device_id)
        .single();
      if (!device) continue;

      const alert = await createAlert(supabase, {
        organization_id: org.id,
        venue_id: device.venue_id,
        room_id: device.room_id,
        device_id: device.id,
        collector_id: collectorId,
        severity: "warning",
        rule_key: "projector_availability_error",
        title: `${device.name} — error de disponibilidad`,
        message: "PJLink Class 2 reporta estado de error en el proyector.",
      });
      if (alert && "title" in alert) {
        await notifyAlert(supabase, org, alert as { id: string; title: string; message?: string; severity: string });
      }
    } else if (
      m.name === "projector.availability" &&
      m.value === "available"
    ) {
      await resolveAlerts(supabase, org.id, "projector_availability_error", m.device_id);
    }
  }

  if (!(await isRuleEnabled(supabase, org.id, "projector_lamp_hours"))) return;

  for (const m of metrics) {
    if (m.name !== "projector.lamp_hours" || typeof m.value !== "number") continue;
    if (m.value < org.lamp_hours_warning) continue;

    const { data: device } = await supabase
      .from("av_devices")
      .select("id, name, venue_id, room_id")
      .eq("id", m.device_id)
      .single();
    if (!device) continue;

    const alert = await createAlert(supabase, {
      organization_id: org.id,
      venue_id: device.venue_id,
      room_id: device.room_id,
      device_id: device.id,
      collector_id: collectorId,
      severity: "warning",
      rule_key: "projector_lamp_hours",
      title: `Lámpara de ${device.name} — ${m.value} h`,
      message: `Supera el umbral de ${org.lamp_hours_warning} horas. Planifica mantenimiento.`,
    });
    if (alert && "title" in alert) {
      await notifyAlert(supabase, org, alert as { id: string; title: string; message?: string; severity: string });
    }
  }
}

export async function evaluateCollectorOffline(
  supabase: SupabaseClient,
  offlineAfterMinutes = 5,
) {
  const cutoff = new Date(Date.now() - offlineAfterMinutes * 60 * 1000).toISOString();

  const { data: offlineCollectors } = await supabase
    .from("collectors")
    .select("id, name, organization_id, venue_id, last_seen_at")
    .eq("status", "active")
    .not("organization_id", "is", null)
    .or(`last_seen_at.is.null,last_seen_at.lt.${cutoff}`);

  for (const c of offlineCollectors ?? []) {
    if (!(await isRuleEnabled(supabase, c.organization_id, "collector_offline"))) continue;

    const { data: org } = await supabase
      .from("organizations")
      .select(
        "id, timezone, notification_email, alerts_email_enabled, lamp_hours_warning, pre_opening_alert_minutes, webhook_url, webhook_enabled, webhook_min_severity",
      )
      .eq("id", c.organization_id)
      .single();
    if (!org) continue;

    const alert = await createAlert(supabase, {
      organization_id: c.organization_id,
      venue_id: c.venue_id,
      collector_id: c.id,
      severity: "critical",
      rule_key: "collector_offline",
      title: `Collector ${c.name ?? "Observal"} desconectado`,
      message: `Última conexión: ${c.last_seen_at ?? "nunca"}`,
    });
    if (alert && "title" in alert) {
      await notifyAlert(supabase, org, alert as { id: string; title: string; message?: string; severity: string });
    }

    await supabase.from("collectors").update({ status: "offline" }).eq("id", c.id);
  }
}
