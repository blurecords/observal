import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

interface AnnounceBody {
  hardware_id: string;
  firmware_version?: string;
  local_ip?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body: AnnounceBody = await req.json();
    if (!body.hardware_id) {
      return jsonResponse({ error: "hardware_id required" }, 400);
    }

    const { data: factory } = await supabase
      .from("devices_factory")
      .select("hardware_id, status")
      .eq("hardware_id", body.hardware_id)
      .maybeSingle();

    if (!factory) {
      return jsonResponse({ error: "unknown device" }, 404);
    }

    const { data: collector, error } = await supabase
      .from("collectors")
      .upsert(
        {
          hardware_id: body.hardware_id,
          firmware_version: body.firmware_version ?? "0.1.0",
          local_ip: body.local_ip ?? null,
          last_seen_at: new Date().toISOString(),
          status: "online_unclaimed",
        },
        { onConflict: "hardware_id" },
      )
      .select("id, status, organization_id")
      .single();

    if (error) throw error;

    if (collector.organization_id) {
      await supabase
        .from("collectors")
        .update({ status: "active", last_seen_at: new Date().toISOString() })
        .eq("id", collector.id);
    }

    return jsonResponse({
      ok: true,
      collector_id: collector.id,
      status: collector.organization_id ? "active" : "online_unclaimed",
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
