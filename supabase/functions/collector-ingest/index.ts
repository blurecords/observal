import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { evaluateIngestAlerts } from "../_shared/alert-engine.ts";
import { corsHeaders, hashToken, jsonResponse } from "../_shared/cors.ts";

interface IngestBody {
  collector_id: string;
  metrics?: Array<{
    device_id: string;
    name: string;
    value: number | string | boolean;
    status?: string;
    ts: string;
    labels?: Record<string, string>;
  }>;
  heartbeats?: Array<{
    device_id: string;
    status: string;
    latency_ms?: number;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.slice(7);
    const tokenHash = await hashToken(token);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: IngestBody = await req.json();
    if (!body.collector_id) {
      return jsonResponse({ error: "collector_id required" }, 400);
    }

    const { data: collector } = await supabase
      .from("collectors")
      .select("id, organization_id, ingest_token_hash, status")
      .eq("id", body.collector_id)
      .maybeSingle();

    if (!collector || collector.status === "revoked") {
      return jsonResponse({ error: "Collector not found or revoked" }, 404);
    }

    if (collector.ingest_token_hash !== tokenHash) {
      return jsonResponse({ error: "Invalid ingest token" }, 401);
    }

    await supabase
      .from("collectors")
      .update({ last_seen_at: new Date().toISOString(), status: "active" })
      .eq("id", collector.id);

    if (collector.organization_id) {
      await supabase
        .from("alerts")
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq("collector_id", collector.id)
        .eq("rule_key", "collector_offline")
        .eq("resolved", false);
    }

    if (body.metrics?.length) {
      const rows = body.metrics.map((m) => ({
        organization_id: collector.organization_id,
        collector_id: collector.id,
        device_id: m.device_id,
        name: m.name,
        value_numeric: typeof m.value === "number" ? m.value : null,
        value_text: typeof m.value === "string" ? m.value : null,
        value_bool: typeof m.value === "boolean" ? m.value : null,
        status: m.status ?? null,
        labels: m.labels ?? {},
        recorded_at: m.ts,
      }));

      const { error: metricsError } = await supabase.from("metrics").insert(rows);
      if (metricsError) throw metricsError;

      for (const hb of body.heartbeats ?? []) {
        await supabase
          .from("av_devices")
          .update({
            last_status: hb.status,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", hb.device_id);
      }
    }

    if (body.heartbeats?.length) {
      await supabase.from("collector_heartbeats").insert({
        collector_id: collector.id,
        organization_id: collector.organization_id,
        status: "active",
        devices_polled: body.heartbeats.length,
        recorded_at: new Date().toISOString(),
      });
    }

    if (collector.organization_id && (body.heartbeats?.length || body.metrics?.length)) {
      await evaluateIngestAlerts(
        supabase,
        collector.id,
        collector.organization_id,
        body.heartbeats ?? [],
        (body.metrics ?? []).map((m) => ({
          device_id: m.device_id,
          name: m.name,
          value: m.value,
        })),
      );
    }

    return jsonResponse({ ok: true, accepted: body.metrics?.length ?? 0 });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
