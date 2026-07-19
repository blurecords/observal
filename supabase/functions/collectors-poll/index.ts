import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const hardwareId =
      req.headers.get("x-collector-hardware-id") ??
      new URL(req.url).searchParams.get("hardware_id");

    if (!hardwareId) {
      return jsonResponse({ error: "hardware_id required" }, 400);
    }

    const { data: collector, error } = await supabase
      .from("collectors")
      .select("id, status, organization_id, venue_id, config_version, ingest_token_hash, pending_ingest_token")
      .eq("hardware_id", hardwareId)
      .maybeSingle();

    if (error) throw error;
    if (!collector) {
      return jsonResponse({ error: "collector not found" }, 404);
    }

    await supabase
      .from("collectors")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", collector.id);

    if (!collector.organization_id) {
      return jsonResponse({ status: "online_unclaimed" });
    }

    const { data: configRow } = await supabase
      .from("collector_configs")
      .select("version, config_json")
      .eq("collector_id", collector.id)
      .maybeSingle();

    const { data: devices } = await supabase
      .from("av_devices")
      .select(
        "id, name, host, device_type, profile, brand, model, room_id, critical, enabled",
      )
      .eq("collector_id", collector.id)
      .eq("enabled", true);

    const config = {
      poll_interval_sec: 60,
      send_interval_sec: 60,
      devices: (devices ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        host: d.host,
        device_type: d.device_type,
        profile: d.profile,
        brand: d.brand,
        model: d.model,
        room_id: d.room_id,
        critical: d.critical,
      })),
      ...(configRow?.config_json ?? {}),
    };

    let ingestToken: string | undefined;
    if (collector.pending_ingest_token) {
      ingestToken = collector.pending_ingest_token;
      await supabase
        .from("collectors")
        .update({ pending_ingest_token: null })
        .eq("id", collector.id);
    }

    return jsonResponse({
      status: collector.status === "revoked" ? "revoked" : "active",
      collector_id: collector.id,
      site_id: collector.venue_id,
      organization_id: collector.organization_id,
      config_version: configRow?.version ?? collector.config_version,
      ingest_token: ingestToken,
      config,
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
