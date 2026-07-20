"use server";

import { logAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role === "viewer") return null;
  return { supabase, userId: user.id, orgId: profile.organization_id as string };
}

export async function acknowledgeAlert(alertId: string, title: string) {
  const actor = await getActor();
  if (!actor) return { error: "Sin permiso" };

  const { error } = await actor.supabase
    .from("alerts")
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: actor.userId,
    })
    .eq("id", alertId);

  if (error) return { error: error.message };

  await logAudit(actor.supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: "alert.acknowledge",
    entityType: "alert",
    entityId: alertId,
    summary: `Alerta vista: ${title}`,
  });

  revalidatePath("/app/alerts");
  return { ok: true };
}

export async function resolveAlert(alertId: string, title: string) {
  const actor = await getActor();
  if (!actor) return { error: "Sin permiso" };

  const { error } = await actor.supabase
    .from("alerts")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("id", alertId);

  if (error) return { error: error.message };

  await logAudit(actor.supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: "alert.resolve",
    entityType: "alert",
    entityId: alertId,
    summary: `Alerta resuelta: ${title}`,
  });

  revalidatePath("/app/alerts");
  return { ok: true };
}
