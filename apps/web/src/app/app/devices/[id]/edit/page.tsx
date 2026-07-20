"use client";

import { createClient } from "@/lib/supabase/client";
import {
  BRAND_SUGGESTIONS,
  DEFAULT_TCP_PORTS,
  DEVICE_TYPES,
  getDeviceType,
  PROFILE_LABELS,
  profileNeedsPjlink,
  profileNeedsSis,
  profileNeedsSnmp,
  profileNeedsTcpPort,
  type DeviceType,
  type MonitoringProfile,
} from "@/lib/av-catalog";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditDevicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string; venue_id: string }>>([]);
  const [collectors, setCollectors] = useState<Array<{ id: string; name: string | null }>>([]);

  const [deviceType, setDeviceType] = useState<DeviceType>("generic_av");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [host, setHost] = useState("");
  const [profile, setProfile] = useState<MonitoringProfile>("ping");
  const [snmpCommunity, setSnmpCommunity] = useState("public");
  const [pjlinkPassword, setPjlinkPassword] = useState("");
  const [tcpPort, setTcpPort] = useState("80");
  const [sisPort, setSisPort] = useState("23");
  const [sisPassword, setSisPassword] = useState("");
  const [venueId, setVenueId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [collectorId, setCollectorId] = useState("");
  const [critical, setCritical] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    async function load() {
      const [deviceRes, v, r, c] = await Promise.all([
        supabase
          .from("av_devices")
          .select("*")
          .eq("id", id)
          .single(),
        supabase.from("venues").select("id, name").order("name"),
        supabase.from("rooms").select("id, name, venue_id").order("name"),
        supabase.from("collectors").select("id, name").eq("status", "active"),
      ]);

      if (deviceRes.error || !deviceRes.data) {
        setError("Equipo no encontrado.");
        setLoading(false);
        return;
      }

      const d = deviceRes.data;
      const meta = (d.metadata ?? {}) as Record<string, string | number>;

      setDeviceType(d.device_type as DeviceType);
      setName(d.name);
      setBrand(d.brand ?? "");
      setModel(d.model ?? "");
      setHost(d.host);
      setProfile(d.profile as MonitoringProfile);
      setVenueId(d.venue_id);
      setRoomId(d.room_id ?? "");
      setCollectorId(d.collector_id);
      setCritical(d.critical ?? false);
      setEnabled(d.enabled ?? true);
      setSnmpCommunity(String(meta.snmp_community ?? "public"));
      setPjlinkPassword(String(meta.pjlink_password ?? ""));
      setTcpPort(String(meta.tcp_port ?? DEFAULT_TCP_PORTS[d.device_type as DeviceType] ?? 80));
      setSisPort(String(meta.sis_port ?? 23));
      setSisPassword(String(meta.sis_password ?? ""));

      setVenues(v.data ?? []);
      setRooms(r.data ?? []);
      setCollectors(c.data ?? []);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  const typeOption = getDeviceType(deviceType);
  const filteredRooms = rooms.filter((r) => r.venue_id === venueId);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !host || !collectorId || !venueId) {
      setError("Completa los campos obligatorios.");
      return;
    }

    setSaving(true);
    setError(null);

    const metadata: Record<string, string | number> = {};
    if (profileNeedsSnmp(profile)) {
      metadata.snmp_version = "2c";
      metadata.snmp_community = snmpCommunity;
    }
    if (profileNeedsPjlink(profile) && pjlinkPassword) {
      metadata.pjlink_password = pjlinkPassword;
    }
    if (profileNeedsTcpPort(profile)) {
      metadata.tcp_port = parseInt(tcpPort, 10) || 80;
    }
    if (profileNeedsSis(profile)) {
      metadata.sis_port = parseInt(sisPort, 10) || 23;
      if (sisPassword) metadata.sis_password = sisPassword;
    }

    const { error: updateError } = await supabase
      .from("av_devices")
      .update({
        name: name.trim(),
        device_type: deviceType,
        brand: brand || null,
        model: model || null,
        host,
        profile,
        venue_id: venueId,
        room_id: roomId || null,
        collector_id: collectorId,
        critical,
        enabled,
        metadata,
      })
      .eq("id", id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push(`/app/devices/${id}`);
    router.refresh();
  }

  async function handleDisable() {
    if (!confirm("¿Desactivar este equipo? Dejará de monitorizarse.")) return;
    await supabase.from("av_devices").update({ enabled: false }).eq("id", id);
    router.push("/app/devices");
    router.refresh();
  }

  if (loading) {
    return <p className="text-muted text-sm">Cargando…</p>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href={`/app/devices/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al equipo
        </Link>
        <h2 className="text-2xl font-bold">Editar equipo</h2>
        <p className="text-muted mt-1">
          Los cambios se aplican al collector en el próximo ciclo de poll.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-card bg-card p-6">
        <div>
          <label className="block text-sm font-medium mb-2">Tipo</label>
          <select
            value={deviceType}
            onChange={(e) => {
              const t = e.target.value as DeviceType;
              setDeviceType(t);
              const opt = getDeviceType(t);
              if (opt && !opt.suggestedProfiles.includes(profile)) {
                setProfile(opt.defaultProfile);
              }
            }}
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 text-sm"
          >
            {DEVICE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Nombre *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Marca</label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              list="brands-edit"
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3"
            />
            <datalist id="brands-edit">
              {(BRAND_SUGGESTIONS[deviceType] ?? []).map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Modelo</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">IP *</label>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            required
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono"
          />
        </div>

        {typeOption && (
          <div>
            <label className="block text-sm font-medium mb-2">Protocolo</label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value as MonitoringProfile)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3"
            >
              {typeOption.suggestedProfiles.map((p) => (
                <option key={p} value={p}>
                  {PROFILE_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        )}

        {profileNeedsSnmp(profile) && (
          <div>
            <label className="block text-sm font-medium mb-2">Comunidad SNMP</label>
            <input
              value={snmpCommunity}
              onChange={(e) => setSnmpCommunity(e.target.value)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono"
            />
          </div>
        )}

        {profileNeedsPjlink(profile) && (
          <div>
            <label className="block text-sm font-medium mb-2">Contraseña PJLink</label>
            <input
              type="password"
              value={pjlinkPassword}
              onChange={(e) => setPjlinkPassword(e.target.value)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3"
            />
          </div>
        )}

        {profileNeedsTcpPort(profile) && (
          <div>
            <label className="block text-sm font-medium mb-2">Puerto TCP</label>
            <input
              value={tcpPort}
              onChange={(e) => setTcpPort(e.target.value)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono"
            />
          </div>
        )}

        {profileNeedsSis(profile) && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Puerto SIS</label>
              <input
                value={sisPort}
                onChange={(e) => setSisPort(e.target.value)}
                className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Contraseña SIS</label>
              <input
                type="password"
                value={sisPassword}
                onChange={(e) => setSisPassword(e.target.value)}
                className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3"
              />
            </div>
          </>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Venue *</label>
            <select
              value={venueId}
              onChange={(e) => {
                setVenueId(e.target.value);
                setRoomId("");
              }}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 text-sm"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Sala</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 text-sm"
            >
              <option value="">Sin sala</option>
              {filteredRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Collector *</label>
          <select
            value={collectorId}
            onChange={(e) => setCollectorId(e.target.value)}
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 text-sm"
          >
            {collectors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? "Observal Collector"}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={critical}
            onChange={(e) => setCritical(e.target.checked)}
          />
          <span className="text-sm">Equipo crítico</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="text-sm">Monitorización activa</span>
        </label>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </button>
          <button
            type="button"
            onClick={handleDisable}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Desactivar equipo
          </button>
        </div>
      </form>
    </div>
  );
}
