export type AlertRuleKey =
  | "device_offline"
  | "critical_device_offline"
  | "projector_lamp_hours"
  | "collector_offline";

export const ALERT_RULES: Record<
  AlertRuleKey,
  { label: string; description: string; defaultSeverity: string }
> = {
  device_offline: {
    label: "Equipo offline",
    description: "Se dispara cuando un equipo AV deja de responder.",
    defaultSeverity: "warning",
  },
  critical_device_offline: {
    label: "Equipo crítico offline antes de apertura",
    description:
      "Equipo marcado como crítico sin respuesta dentro del margen previo a la apertura del museo.",
    defaultSeverity: "critical",
  },
  projector_lamp_hours: {
    label: "Horas de lámpara elevadas",
    description: "Proyector supera el umbral de horas de lámpara configurado.",
    defaultSeverity: "warning",
  },
  collector_offline: {
    label: "Collector desconectado",
    description: "La Raspberry Pi no se comunica con Observal.",
    defaultSeverity: "critical",
  },
};

export const DAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
