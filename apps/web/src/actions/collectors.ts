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
  if (!profile || profile.role !== "owner") return null;
  return { supabase, userId: user.id, orgId: profile.organization_id as string, accessToken: (await supabase.auth.getSession()).data.session?.access_token };
}

async function callCollectorFunction(path: string, collectorId: string, accessToken: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ collector_id: collectorId }),
    },
  );
  const data = await res.json();
  if (!res.ok) return { error: data.error ?? "Error" };
  return { ok: true, message: data.message as string | undefined };
}

export async function rotateCollectorToken(collectorId: string, collectorName: string) {
  const actor = await getActor();
  if (!actor?.accessToken) return { error: "Sin permiso" };

  const result = await callCollectorFunction("collectors-rotate-token", collectorId, actor.accessToken);
  if ("error" in result && result.error) return result;

  await logAudit(actor.supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: "collector.rotate_token",
    entityType: "collector",
    entityId: collectorId,
    summary: `Token rotado: ${collectorName}`,
  });

  revalidatePath("/app/collectors");
  revalidatePath(`/app/collectors/${collectorId}`);
  return { ok: true, message: result.message };
}

export async function revokeCollector(collectorId: string, collectorName: string) {
  const actor = await getActor();
  if (!actor?.accessToken) return { error: "Sin permiso" };

  const result = await callCollectorFunction("collectors-revoke", collectorId, actor.accessToken);
  if ("error" in result && result.error) return result;

  await logAudit(actor.supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: "collector.revoke",
    entityType: "collector",
    entityId: collectorId,
    summary: `Collector revocado: ${collectorName}`,
  });

  revalidatePath("/app/collectors");
  revalidatePath(`/app/collectors/${collectorId}`);
  return { ok: true, message: result.message };
}
