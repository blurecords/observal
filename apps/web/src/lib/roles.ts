export type UserRole = "owner" | "integrator" | "viewer";

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Propietario",
  integrator: "Integrador AV",
  viewer: "Solo lectura",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: "Acceso completo, equipo y ajustes de organización.",
  integrator: "Gestiona equipos, venues, collectors y alertas.",
  viewer: "Consulta dashboards, métricas y alertas sin modificar.",
};

export function canManage(role: UserRole): boolean {
  return role === "owner" || role === "integrator";
}

export function isOwner(role: UserRole): boolean {
  return role === "owner";
}

export function canManageTeam(role: UserRole): boolean {
  return role === "owner";
}

export function canManageOrgSettings(role: UserRole): boolean {
  return role === "owner";
}

export function canManageCollectorsSecurity(role: UserRole): boolean {
  return role === "owner";
}

export function canAckAlerts(role: UserRole): boolean {
  return canManage(role);
}

export function parseRole(value: string | null | undefined): UserRole {
  if (value === "integrator" || value === "viewer") return value;
  return "owner";
}
