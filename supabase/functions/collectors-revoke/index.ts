import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, hashToken, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();
    if (!profile) return jsonResponse({ error: "Profile not found" }, 404);
    if (profile.role !== "owner") {
      return jsonResponse({ error: "Solo el propietario puede revocar collectors" }, 403);
    }

    const { collector_id } = await req.json();
    if (!collector_id) return jsonResponse({ error: "collector_id required" }, 400);

    const { data: collector } = await supabase
      .from("collectors")
      .select("id, hardware_id, organization_id")
      .eq("id", collector_id)
      .single();

    if (!collector || collector.organization_id !== profile.organization_id) {
      return jsonResponse({ error: "Collector not found" }, 404);
    }

    await supabase
      .from("collectors")
      .update({
        status: "revoked",
        ingest_token_hash: null,
        pending_ingest_token: null,
      })
      .eq("id", collector_id);

    await supabase
      .from("devices_factory")
      .update({ status: "revoked" })
      .eq("hardware_id", collector.hardware_id);

    await supabase
      .from("alerts")
      .insert({
        organization_id: profile.organization_id,
        collector_id,
        severity: "info",
        title: "Collector revocado",
        message: "El collector fue desvinculado manualmente desde la plataforma.",
        rule_key: "manual_revoke",
        resolved: true,
        resolved_at: new Date().toISOString(),
      });

    return jsonResponse({ ok: true, status: "revoked" });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
