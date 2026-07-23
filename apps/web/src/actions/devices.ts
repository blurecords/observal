"use server";

import { logAudit } from "@/lib/audit";
import { prepareDeviceStorage } from "@/lib/credentials-crypto";
import { parsePlan, planLimitMessage, PLAN_LIMITS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface DeviceInput {
  organization_id: string;
  venue_id: string;
  room_id?: string | null;
  collector_id: string;
  name: string;
  device_type: string;
  brand?: string | null;
  model?: string | null;
  host: string;
  profile: string;
  critical: boolean;
  enabled?: boolean;
  metadata: Record<string, unknown>;
}

async function getActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile) return null;
  return { supabase, userId: user.id, orgId: profile.organization_id as string };
}

async function checkDeviceLimit(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string, adding: number) {
  const { data: org } = await supabase.from("organizations").select("plan").eq("id", orgId).single();
  const plan = parsePlan(org?.plan);
  const max = PLAN_LIMITS[plan].maxDevices;
  if (max === null) return null;

  const { count } = await supabase
    .from("av_devices")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("enabled", true);

  if ((count ?? 0) + adding > max) {
    return planLimitMessage(plan, "devices", count ?? 0);
  }
  return null;
}

export async function createDevice(input: DeviceInput) {
  const actor = await getActor();
  if (!actor) return { error: "No autenticado" };
  const { supabase } = actor;

  const limitError = await checkDeviceLimit(supabase, actor.orgId, 1);
  if (limitError) return { error: limitError };

  const { metadata, credentials_encrypted } = prepareDeviceStorage(input.metadata);

  const { data, error } = await supabase
    .from("av_devices")
    .insert({
      ...input,
      metadata,
      credentials_encrypted,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAudit(supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: "device.create",
    entityType: "av_device",
    entityId: data.id,
    summary: `Equipo creado: ${input.name}`,
    metadata: { host: input.host, profile: input.profile },
  });

  revalidatePath("/app/devices");
  return { ok: true };
}

export async function updateDevice(id: string, input: Partial<DeviceInput>) {
  const actor = await getActor();
  if (!actor) return { error: "No autenticado" };
  const { supabase } = actor;

  const payload: Record<string, unknown> = { ...input };

  if (input.metadata) {
    const { metadata, credentials_encrypted } = prepareDeviceStorage(input.metadata);
    payload.metadata = metadata;
    if (credentials_encrypted) {
      payload.credentials_encrypted = credentials_encrypted;
    }
  }

  const { error } = await supabase.from("av_devices").update(payload).eq("id", id);

  if (error) return { error: error.message };

  await logAudit(supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: input.enabled === false ? "device.disable" : "device.update",
    entityType: "av_device",
    entityId: id,
    summary: input.enabled === false ? "Equipo desactivado" : `Equipo actualizado: ${input.name ?? id}`,
  });

  revalidatePath("/app/devices");
  revalidatePath(`/app/devices/${id}`);
  return { ok: true };
}

export async function deleteDevice(id: string) {
  const actor = await getActor();
  if (!actor) return { error: "No autenticado" };
  const { supabase } = actor;

  const { data: device } = await supabase
    .from("av_devices")
    .select("id, name, organization_id")
    .eq("id", id)
    .eq("organization_id", actor.orgId)
    .single();

  if (!device) return { error: "Equipo no encontrado" };

  const { error } = await supabase.from("av_devices").delete().eq("id", id);

  if (error) return { error: error.message };

  await logAudit(supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: "device.delete",
    entityType: "av_device",
    entityId: id,
    summary: `Equipo eliminado: ${device.name}`,
  });

  revalidatePath("/app/devices");
  return { ok: true };
}

export async function createDevicesBatch(inputs: DeviceInput[]) {
  const actor = await getActor();
  if (!actor) return { error: "No autenticado" };
  const { supabase } = actor;

  const limitError = await checkDeviceLimit(supabase, actor.orgId, inputs.length);
  if (limitError) return { error: limitError };

  const rows = inputs.map((input) => {
    const { metadata, credentials_encrypted } = prepareDeviceStorage(input.metadata);
    return { ...input, metadata, credentials_encrypted };
  });

  const { error } = await supabase.from("av_devices").insert(rows);
  if (error) return { error: error.message };

  await logAudit(supabase, {
    organizationId: actor.orgId,
    userId: actor.userId,
    action: "device.import",
    summary: `Importados ${rows.length} equipos AV`,
    metadata: { count: rows.length },
  });

  revalidatePath("/app/devices");
  return { ok: true, count: rows.length };
}
