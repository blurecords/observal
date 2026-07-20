import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, hashPairingCode, hashToken, jsonResponse } from "../_shared/cors.ts";

interface ClaimBody {
  pairing_code: string;
  venue_id?: string;
  venue_name?: string;
  collector_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return jsonResponse({ error: "Profile not found" }, 404);
    }

    const body: ClaimBody = await req.json();
    if (!body.pairing_code) {
      return jsonResponse({ error: "pairing_code required" }, 400);
    }

    const codeHash = await hashPairingCode(body.pairing_code);

    const { data: factory } = await supabase
      .from("devices_factory")
      .select("hardware_id, status")
      .eq("pairing_code_hash", codeHash)
      .maybeSingle();

    if (!factory) {
      return jsonResponse({ error: "Invalid pairing code" }, 404);
    }

    if (factory.status === "claimed" || factory.status === "revoked") {
      return jsonResponse({ error: "Pairing code already used or revoked" }, 409);
    }

    let venueId = body.venue_id;
    if (!venueId) {
      const venueName = body.venue_name ?? "Mi instalación";
      const { data: venue, error: venueError } = await supabase
        .from("venues")
        .insert({
          organization_id: profile.organization_id,
          name: venueName,
        })
        .select("id")
        .single();
      if (venueError) throw venueError;
      venueId = venue.id;
    }

    const ingestToken = crypto.randomUUID() + crypto.randomUUID();
    const ingestTokenHash = await hashToken(ingestToken);

    const { data: collector, error: collectorError } = await supabase
      .from("collectors")
      .update({
        organization_id: profile.organization_id,
        venue_id: venueId,
        name: body.collector_name ?? "Observal Collector",
        status: "active",
        ingest_token_hash: ingestTokenHash,
        claimed_at: new Date().toISOString(),
        config_version: 1,
      })
      .eq("hardware_id", factory.hardware_id)
      .select("id, hardware_id")
      .single();

    if (collectorError) throw collectorError;

    await supabase
      .from("devices_factory")
      .update({ status: "claimed" })
      .eq("hardware_id", factory.hardware_id);

    await supabase.from("collector_configs").upsert({
      collector_id: collector.id,
      organization_id: profile.organization_id,
      version: 1,
      config_json: { poll_interval_sec: 60, send_interval_sec: 60 },
    });

    await supabase
      .from("collectors")
      .update({ pending_ingest_token: ingestToken })
      .eq("id", collector.id);

    return jsonResponse({
      ok: true,
      collector_id: collector.id,
      venue_id: venueId,
      message: "Collector activado. La Pi recibirá el token en su próximo ciclo.",
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});
