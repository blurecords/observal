import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

/**
 * Scheduled daily via Supabase Cron.
 * Deletes metrics and heartbeats older than each org's retention setting.
 */
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

    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, metrics_retention_days");

    let metricsDeleted = 0;
    let heartbeatsDeleted = 0;

    for (const org of orgs ?? []) {
      const days = org.metrics_retention_days ?? 90;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { count: mCount } = await supabase
        .from("metrics")
        .delete({ count: "exact" })
        .eq("organization_id", org.id)
        .lt("recorded_at", cutoff);

      const { count: hCount } = await supabase
        .from("collector_heartbeats")
        .delete({ count: "exact" })
        .eq("organization_id", org.id)
        .lt("recorded_at", cutoff);

      metricsDeleted += mCount ?? 0;
      heartbeatsDeleted += hCount ?? 0;
    }

    return jsonResponse({
      ok: true,
      metrics_deleted: metricsDeleted,
      heartbeats_deleted: heartbeatsDeleted,
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
