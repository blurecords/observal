"use server";

import { prepareDeviceStorage } from "@/lib/credentials-crypto";
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

export async function createDevice(input: DeviceInput) {
  const supabase = await createClient();
  const { metadata, credentials_encrypted } = prepareDeviceStorage(input.metadata);

  const { error } = await supabase.from("av_devices").insert({
    ...input,
    metadata,
    credentials_encrypted,
  });

  if (error) return { error: error.message };
  revalidatePath("/app/devices");
  return { ok: true };
}

export async function updateDevice(id: string, input: Partial<DeviceInput>) {
  const supabase = await createClient();
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
  revalidatePath("/app/devices");
  revalidatePath(`/app/devices/${id}`);
  return { ok: true };
}

export async function createDevicesBatch(inputs: DeviceInput[]) {
  const supabase = await createClient();
  const rows = inputs.map((input) => {
    const { metadata, credentials_encrypted } = prepareDeviceStorage(input.metadata);
    return { ...input, metadata, credentials_encrypted };
  });

  const { error } = await supabase.from("av_devices").insert(rows);
  if (error) return { error: error.message };
  revalidatePath("/app/devices");
  return { ok: true, count: rows.length };
}
