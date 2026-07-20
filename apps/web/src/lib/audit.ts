import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "device.create"
  | "device.update"
  | "device.import"
  | "device.disable"
  | "team.invite"
  | "team.revoke_invite"
  | "team.role_change"
  | "team.remove"
  | "alert.acknowledge"
  | "alert.resolve"
  | "settings.org"
  | "settings.notifications"
  | "settings.opening_hours"
  | "settings.alert_rule"
  | "collector.rotate_token"
  | "collector.revoke";

interface AuditEntry {
  organizationId: string;
  userId: string;
  action: AuditAction;
  summary: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(
  supabase: SupabaseClient,
  entry: AuditEntry,
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    organization_id: entry.organizationId,
    user_id: entry.userId,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    summary: entry.summary,
    metadata: entry.metadata ?? {},
  });

  if (error) {
    console.error("audit_log insert failed:", error.message);
  }
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "device.create": "Equipo creado",
  "device.update": "Equipo actualizado",
  "device.import": "Importación CSV",
  "device.disable": "Equipo desactivado",
  "team.invite": "Invitación enviada",
  "team.revoke_invite": "Invitación cancelada",
  "team.role_change": "Rol cambiado",
  "team.remove": "Miembro eliminado",
  "alert.acknowledge": "Alerta marcada vista",
  "alert.resolve": "Alerta resuelta",
  "settings.org": "Organización actualizada",
  "settings.notifications": "Notificaciones actualizadas",
  "settings.opening_hours": "Horarios actualizados",
  "settings.alert_rule": "Regla de alerta cambiada",
  "collector.rotate_token": "Token rotado",
  "collector.revoke": "Collector revocado",
};
