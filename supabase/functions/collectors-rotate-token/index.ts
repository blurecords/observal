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
      .select("organization_id")
      .eq("id", user.id)
      .single();
    if (!profile) return jsonResponse({ error: "Profile not found" }, 404);

    const { collector_id } = await req.json();
    if (!collector_id) return jsonResponse({ error: "collector_id required" }, 400);

    const { data: collector } = await supabase
      .from("collectors")
      .select("id, organization_id, status")
      .eq("id", collector_id)
      .single();

    if (!collector || collector.organization_id !== profile.organization_id) {
      return jsonResponse({ error: "Collector not found" }, 404);
    }

    if (collector.status === "revoked") {
      return jsonResponse({ error: "Collector is revoked" }, 409);
    }

    const newToken = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await hashToken(newToken);

    await supabase
      .from("collectors")
      .update({
        ingest_token_hash: tokenHash,
        pending_ingest_token: newToken,
      })
      .eq("id", collector_id);

    return jsonResponse({
      ok: true,
      message: "Token rotado. La Pi recibirá el nuevo token en el próximo ciclo.",
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
