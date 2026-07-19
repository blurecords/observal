import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { evaluateCollectorOffline } from "../_shared/alert-engine.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

/**
 * Scheduled via Supabase Cron (every 5 min) or manual invoke.
 * Checks for collectors that stopped sending heartbeats.
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

    await evaluateCollectorOffline(supabase, 5);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
