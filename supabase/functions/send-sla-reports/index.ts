import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sendSlaReportEmail } from "../_shared/mail.ts";
import { computeUptimeFromMetrics, pickUptimeMetrics } from "../_shared/sla.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

function computeUptime(online: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((online / total) * 1000) / 10;
}

function lastCompleteMonthRange(now = new Date()) {
  const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const month = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
  const start = new Date(Date.UTC(year, month, 1)).toISOString();
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();
  const label = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month, 1)),
  );
  return { start, end, label };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const today = new Date().getUTCDate();

    const { data: orgs } = await supabase
      .from("organizations")
      .select(
        "id, name, notification_email, sla_report_enabled, sla_target_pct, sla_report_day",
      )
      .eq("sla_report_enabled", true)
      .eq("sla_report_day", today);

    let sent = 0;
    const { start, end, label } = lastCompleteMonthRange();

    for (const org of orgs ?? []) {
      if (!org.notification_email) continue;

      const { data: devices } = await supabase
        .from("av_devices")
        .select("id, name")
        .eq("organization_id", org.id)
        .eq("enabled", true);

      let totalSamples = 0;
      let onlineSamples = 0;

      for (const device of devices ?? []) {
        const { data: metrics } = await supabase
          .from("metrics")
          .select("name, value_bool, value_text")
          .eq("device_id", device.id)
          .in("name", ["device.reachable", "snmp.reachable", "tcp.port_open", "projector.power"])
          .gte("recorded_at", start)
          .lte("recorded_at", end);

        const picked = pickUptimeMetrics(metrics ?? []);
        const { samples, onlineSamples } = computeUptimeFromMetrics(picked);
        totalSamples += samples;
        onlineSamples += onlineSamples;
      }

      const overallUptime = computeUptime(onlineSamples, totalSamples) ?? 0;

      const { count: alertCount } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org.id)
        .gte("triggered_at", start)
        .lte("triggered_at", end);

      const ok = await sendSlaReportEmail({
        to: org.notification_email,
        orgName: org.name,
        periodLabel: label,
        overallUptime,
        targetPct: org.sla_target_pct ?? 99,
        deviceCount: devices?.length ?? 0,
        alertCount: alertCount ?? 0,
      });

      if (ok) sent++;
    }

    return jsonResponse({ ok: true, reports_sent: sent, orgs_checked: orgs?.length ?? 0 });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
