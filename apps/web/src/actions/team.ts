"use server";

import { parseRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || parseRole(profile.role) !== "owner") {
    throw new Error("Solo el propietario puede gestionar el equipo");
  }

  return { supabase, user, orgId: profile.organization_id as string };
}

export async function createInvite(email: string, role: "integrator" | "viewer") {
  const { supabase, user, orgId } = await requireOwner();
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return { error: "Email inválido" };

  const token = randomBytes(24).toString("hex");

  const { error } = await supabase.from("org_invites").insert({
    organization_id: orgId,
    email: normalized,
    role,
    token,
    invited_by: user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) {
    if (error.code === "23505") return { error: "Ya existe una invitación para ese email" };
    return { error: error.message };
  }

  revalidatePath("/app/settings");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return { ok: true, inviteUrl: `${appUrl}/invite/${token}` };
}

export async function revokeInvite(inviteId: string) {
  const { supabase } = await requireOwner();
  const { error } = await supabase.from("org_invites").delete().eq("id", inviteId);
  if (error) return { error: error.message };
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function updateMemberRole(memberId: string, role: "integrator" | "viewer") {
  const { supabase, user, orgId } = await requireOwner();
  if (memberId === user.id) return { error: "No puedes cambiar tu propio rol" };

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", memberId)
    .eq("organization_id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function removeMember(memberId: string) {
  const { supabase, user, orgId } = await requireOwner();
  if (memberId === user.id) return { error: "No puedes eliminarte a ti mismo" };

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", orgId)
    .neq("role", "owner");

  if (error) return { error: error.message };
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Inicia sesión primero" };

  const { data, error } = await supabase.rpc("accept_org_invite", {
    p_token: token,
    p_user_id: user.id,
  });

  if (error) return { error: error.message };

  const result = data as { error?: string; ok?: boolean };
  if (result.error) return { error: result.error };

  revalidatePath("/app");
  return { ok: true };
}
