export type DeviceType =
  | "projector"
  | "led_processor"
  | "led_panel"
  | "video_matrix"
  | "audio_mixer"
  | "lighting_desk"
  | "lighting_node"
  | "amplifier"
  | "dsp"
  | "speaker_zone"
  | "media_player"
  | "show_controller"
  | "generic_av";

export type MonitoringProfile =
  | "ping"
  | "pjlink_class1"
  | "pjlink_class2"
  | "snmp_generic"
  | "snmp_qsc"
  | "tcp_health";

export interface DeviceTypeOption {
  id: DeviceType;
  label: string;
  icon: string;
  defaultProfile: MonitoringProfile;
  suggestedProfiles: MonitoringProfile[];
}

export const DEVICE_TYPES: DeviceTypeOption[] = [
  {
    id: "projector",
    label: "Proyector",
    icon: "📽️",
    defaultProfile: "pjlink_class1",
    suggestedProfiles: ["pjlink_class1", "pjlink_class2", "snmp_generic", "ping"],
  },
  {
    id: "led_processor",
    label: "Procesador LED",
    icon: "🖥️",
    defaultProfile: "tcp_health",
    suggestedProfiles: ["tcp_health", "snmp_generic", "ping"],
  },
  {
    id: "led_panel",
    label: "Pantalla LED",
    icon: "📺",
    defaultProfile: "ping",
    suggestedProfiles: ["ping", "tcp_health"],
  },
  {
    id: "video_matrix",
    label: "Matriz de vídeo",
    icon: "🔀",
    defaultProfile: "snmp_generic",
    suggestedProfiles: ["snmp_generic", "tcp_health", "ping"],
  },
  {
    id: "audio_mixer",
    label: "Mesa de sonido",
    icon: "🎚️",
    defaultProfile: "ping",
    suggestedProfiles: ["ping", "snmp_generic", "tcp_health"],
  },
  {
    id: "lighting_desk",
    label: "Mesa de luces",
    icon: "💡",
    defaultProfile: "ping",
    suggestedProfiles: ["ping", "tcp_health"],
  },
  {
    id: "lighting_node",
    label: "Nodo de luces",
    icon: "🔦",
    defaultProfile: "ping",
    suggestedProfiles: ["ping", "tcp_health"],
  },
  {
    id: "amplifier",
    label: "Amplificador",
    icon: "🔊",
    defaultProfile: "snmp_qsc",
    suggestedProfiles: ["snmp_qsc", "snmp_generic", "ping"],
  },
  {
    id: "dsp",
    label: "Procesador DSP",
    icon: "🎛️",
    defaultProfile: "snmp_generic",
    suggestedProfiles: ["snmp_generic", "ping"],
  },
  {
    id: "speaker_zone",
    label: "Zona de PA",
    icon: "📢",
    defaultProfile: "ping",
    suggestedProfiles: ["ping"],
  },
  {
    id: "media_player",
    label: "Media player",
    icon: "▶️",
    defaultProfile: "tcp_health",
    suggestedProfiles: ["tcp_health", "ping"],
  },
  {
    id: "show_controller",
    label: "Control de show",
    icon: "🎬",
    defaultProfile: "tcp_health",
    suggestedProfiles: ["tcp_health", "ping"],
  },
  {
    id: "generic_av",
    label: "AV genérico",
    icon: "⚙️",
    defaultProfile: "ping",
    suggestedProfiles: ["ping", "snmp_generic", "tcp_health"],
  },
];

export const PROFILE_LABELS: Record<MonitoringProfile, string> = {
  ping: "Ping (disponibilidad)",
  pjlink_class1: "PJLink Class 1 (proyectores)",
  pjlink_class2: "PJLink Class 2 (proyectores)",
  snmp_generic: "SNMP genérico",
  snmp_qsc: "SNMP QSC / amplificadores",
  tcp_health: "Puerto TCP",
};

export const BRAND_SUGGESTIONS: Partial<Record<DeviceType, string[]>> = {
  projector: ["Panasonic", "Christie", "Barco", "Epson", "Sony", "NEC"],
  led_processor: ["NovaStar", "Colorlight", "Brompton", "Megapixel"],
  video_matrix: ["Extron", "Kramer", "Lightware", "Blackmagic", "Crestron"],
  audio_mixer: ["Yamaha", "Allen & Heath", "DiGiCo", "Soundcraft", "Midas"],
  amplifier: ["QSC", "Powersoft", "Lab.gruppen", "Crown", "Powersoft"],
  lighting_desk: ["grandMA", "ETC", "Avolites", "ChamSys"],
  dsp: ["QSC", "Biamp", "Bose", "Xilica"],
};

export function getDeviceType(id: DeviceType) {
  return DEVICE_TYPES.find((t) => t.id === id);
}

export function profileNeedsSnmp(profile: MonitoringProfile) {
  return profile === "snmp_generic" || profile === "snmp_qsc";
}

export function profileNeedsPjlink(profile: MonitoringProfile) {
  return profile.startsWith("pjlink");
}

export function profileNeedsTcpPort(profile: MonitoringProfile) {
  return profile === "tcp_health";
}

export const DEFAULT_TCP_PORTS: Partial<Record<DeviceType, number>> = {
  projector: 4352,
  led_processor: 5200,
  video_matrix: 23,
  media_player: 80,
  show_controller: 8080,
};

export const STATUS_LABELS: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  warning: "Aviso",
  critical: "Crítico",
  unknown: "Desconocido",
};

export const STATUS_COLORS: Record<string, string> = {
  online: "bg-green-500/20 text-green-400",
  offline: "bg-red-500/20 text-red-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-red-500/20 text-red-400",
  unknown: "bg-gray-500/20 text-gray-400",
};
