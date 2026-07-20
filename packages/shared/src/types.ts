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

export type DeviceStatus = "online" | "offline" | "warning" | "critical" | "unknown";

export type CollectorStatus =
  | "manufactured"
  | "online_unclaimed"
  | "claimed"
  | "active"
  | "offline"
  | "revoked";

export type MonitoringProfile =
  | "ping"
  | "pjlink_class1"
  | "pjlink_class2"
  | "snmp_generic"
  | "snmp_qsc"
  | "tcp_health"
  | "extron_sis"
  | "novastar_http";

export interface AvMetric {
  device_id: string;
  name: string;
  value: number | string | boolean;
  status?: DeviceStatus;
  ts: string;
  labels?: Record<string, string>;
}

export interface CollectorAnnouncePayload {
  hardware_id: string;
  firmware_version: string;
  local_ip?: string;
}

export interface CollectorPollResponse {
  status: CollectorStatus;
  collector_id?: string;
  ingest_token?: string;
  site_id?: string;
  organization_id?: string;
  config_version?: number;
  config?: CollectorRemoteConfig;
}

export interface CollectorRemoteConfig {
  poll_interval_sec: number;
  send_interval_sec: number;
  devices: RemoteDeviceConfig[];
}

export interface RemoteDeviceConfig {
  id: string;
  name: string;
  host: string;
  device_type: DeviceType;
  profile: MonitoringProfile;
  brand?: string;
  model?: string;
  room_id?: string;
  critical: boolean;
  credentials?: Record<string, string>;
}

export interface IngestPayload {
  collector_id: string;
  metrics: AvMetric[];
  heartbeats?: Array<{
    device_id: string;
    status: DeviceStatus;
    latency_ms?: number;
  }>;
}
