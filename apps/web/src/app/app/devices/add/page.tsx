"use client";

import { createDevice } from "@/actions/devices";
import { createClient } from "@/lib/supabase/client";
import {
  BRAND_SUGGESTIONS,
  DEFAULT_TCP_PORTS,
  DEFAULT_NOVASTAR_TCP_PORT,
  DEVICE_TYPES,
  type DeviceType,
  getDeviceType,
  PROFILE_LABELS,
  profileNeedsNovaStar,
  profileNeedsPjlink,
  profileNeedsMikrotikApi,
  profileNeedsSis,
  profileNeedsSnmp,
  profileNeedsTcpPort,
  type MonitoringProfile,
} from "@/lib/av-catalog";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Step = 1 | 2 | 3 | 4;

interface VenueOption {
  id: string;
  name: string;
}

interface RoomOption {
  id: string;
  name: string;
  venue_id: string;
}

interface CollectorOption {
  id: string;
  name: string | null;
}

export default function AddDevicePage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [collectors, setCollectors] = useState<CollectorOption[]>([]);

  const [deviceType, setDeviceType] = useState<DeviceType | null>(null);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [profile, setProfile] = useState<MonitoringProfile>("ping");
  const [snmpCommunity, setSnmpCommunity] = useState("public");
  const [pjlinkPassword, setPjlinkPassword] = useState("");
  const [tcpPort, setTcpPort] = useState("80");
  const [sisPort, setSisPort] = useState("23");
  const [sisPassword, setSisPassword] = useState("");
  const [novastarPort, setNovastarPort] = useState("8001");
  const [novastarTcpPort, setNovastarTcpPort] = useState(String(DEFAULT_NOVASTAR_TCP_PORT));
  const [mikrotikUsername, setMikrotikUsername] = useState("admin");
  const [mikrotikPassword, setMikrotikPassword] = useState("");
  const [mikrotikApiPort, setMikrotikApiPort] = useState("443");
  const [mikrotikUseHttps, setMikrotikUseHttps] = useState(true);
  const [venueId, setVenueId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [collectorId, setCollectorId] = useState("");
  const [critical, setCritical] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();
      if (!profile) return;
      setOrgId(profile.organization_id);

      const [v, r, c] = await Promise.all([
        supabase.from("venues").select("id, name").order("name"),
        supabase.from("rooms").select("id, name, venue_id").order("name"),
        supabase
          .from("collectors")
          .select("id, name")
          .eq("status", "active")
          .order("name"),
      ]);

      setVenues(v.data ?? []);
      setRooms(r.data ?? []);
      setCollectors(c.data ?? []);

      if (v.data?.[0]) setVenueId(v.data[0].id);
      if (c.data?.[0]) setCollectorId(c.data[0].id);
    }
    load();
  }, [supabase]);

  function selectType(type: DeviceType) {
    setDeviceType(type);
    const opt = getDeviceType(type)!;
    setProfile(opt.defaultProfile);
    if (DEFAULT_TCP_PORTS[type]) {
      setTcpPort(String(DEFAULT_TCP_PORTS[type]));
    }
    if (!name) setName(opt.label);
  }

  const filteredRooms = rooms.filter((r) => r.venue_id === venueId);
  const typeOption = deviceType ? getDeviceType(deviceType) : null;

  async function handleSubmit() {
    if (!orgId || !deviceType || !collectorId || !venueId || !host || !name) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    if (profileNeedsMikrotikApi(profile) && !mikrotikPassword) {
      setError("La contraseña RouterOS es obligatoria para el perfil MikroTik API.");
      return;
    }

    setLoading(true);
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
    if (profileNeedsNovaStar(profile)) {
      metadata.novastar_port = parseInt(novastarPort, 10) || 8001;
      metadata.novastar_tcp_port = parseInt(novastarTcpPort, 10) || DEFAULT_NOVASTAR_TCP_PORT;
    }
    if (profileNeedsMikrotikApi(profile)) {
      metadata.mikrotik_username = mikrotikUsername || "admin";
      if (mikrotikPassword) metadata.mikrotik_password = mikrotikPassword;
      metadata.mikrotik_api_port = parseInt(mikrotikApiPort, 10) || 443;
      metadata.mikrotik_use_https = mikrotikUseHttps ? "true" : "false";
    }

    const result = await createDevice({
      organization_id: orgId,
      venue_id: venueId,
      room_id: roomId || null,
      collector_id: collectorId,
      name,
      device_type: deviceType,
      brand: brand || null,
      model: model || null,
      host,
      profile,
      critical,
      enabled: true,
      metadata,
    });

    setLoading(false);

    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    router.push("/app/devices");
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <Link
          href="/app/devices"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Equipos AV
        </Link>
        <h2 className="text-2xl font-bold">Añadir equipo AV</h2>
        <p className="text-muted mt-1">
          Paso {step} de 4 — el collector recibirá la config en el próximo ciclo.
        </p>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full",
              s <= step ? "bg-blue-600" : "bg-[#1a2236]",
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {DEVICE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectType(t.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                deviceType === t.id
                  ? "border-blue-600 bg-blue-600/10"
                  : "border-card bg-card hover:border-blue-600/40",
              )}
            >
              <span className="text-2xl">{t.icon}</span>
              <p className="font-medium mt-2">{t.label}</p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && typeOption && (
        <div className="space-y-4 rounded-xl border border-card bg-card p-6">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Marca</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                list="brands"
                className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <datalist id="brands">
                {(BRAND_SUGGESTIONS[deviceType!] ?? []).map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Modelo</label>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Dirección IP *</label>
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="192.168.10.45"
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Protocolo</label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value as MonitoringProfile)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {typeOption.suggestedProfiles.map((p) => (
                <option key={p} value={p}>
                  {PROFILE_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          {profileNeedsSnmp(profile) && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Comunidad SNMP v2c
              </label>
              <input
                value={snmpCommunity}
                onChange={(e) => setSnmpCommunity(e.target.value)}
                className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}
          {profileNeedsPjlink(profile) && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Contraseña PJLink (opcional)
              </label>
              <input
                type="password"
                value={pjlinkPassword}
                onChange={(e) => setPjlinkPassword(e.target.value)}
                className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}
          {profileNeedsTcpPort(profile) && (
            <div>
              <label className="block text-sm font-medium mb-2">Puerto TCP</label>
              <input
                value={tcpPort}
                onChange={(e) => setTcpPort(e.target.value)}
                className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  placeholder="23"
                  className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Contraseña SIS (opcional)
                </label>
                <input
                  type="password"
                  value={sisPassword}
                  onChange={(e) => setSisPassword(e.target.value)}
                  className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </>
          )}
          {profileNeedsNovaStar(profile) && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Puerto HTTP NovaStar</label>
                <input
                  value={novastarPort}
                  onChange={(e) => setNovastarPort(e.target.value)}
                  placeholder="8001"
                  className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Puerto TCP fallback</label>
                <input
                  value={novastarTcpPort}
                  onChange={(e) => setNovastarTcpPort(e.target.value)}
                  placeholder="5200"
                  className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </>
          )}
          {profileNeedsMikrotikApi(profile) && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Usuario RouterOS</label>
                <input
                  value={mikrotikUsername}
                  onChange={(e) => setMikrotikUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Contraseña RouterOS</label>
                <input
                  type="password"
                  value={mikrotikPassword}
                  onChange={(e) => setMikrotikPassword(e.target.value)}
                  className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Puerto API</label>
                  <input
                    value={mikrotikApiPort}
                    onChange={(e) => setMikrotikApiPort(e.target.value)}
                    placeholder="443"
                    className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-end pb-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={mikrotikUseHttps}
                      onChange={(e) => {
                        setMikrotikUseHttps(e.target.checked);
                        setMikrotikApiPort(e.target.checked ? "443" : "80");
                      }}
                    />
                    HTTPS (RouterOS 7 REST)
                  </label>
                </div>
              </div>
              <p className="text-xs text-muted">
                RouterOS 7: activa www-ssl (443) y usuario con permiso rest-api. REST por HTTP
                solo desde v7.9 — usa HTTPS. Reintroduce la contraseña al guardar.
              </p>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 rounded-xl border border-card bg-card p-6">
          <div>
            <label className="block text-sm font-medium mb-2">Venue / edificio *</label>
            <select
              value={venueId}
              onChange={(e) => {
                setVenueId(e.target.value);
                setRoomId("");
              }}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {venues.length === 0 && (
              <p className="text-xs text-yellow-400 mt-2">
                Crea un venue en{" "}
                <Link href="/app/venues" className="underline">
                  Salas y venues
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Sala / zona</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Sin sala asignada</option>
              {filteredRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Collector *</label>
            <select
              value={collectorId}
              onChange={(e) => setCollectorId(e.target.value)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? "Observal Collector"}
                </option>
              ))}
            </select>
            {collectors.length === 0 && (
              <p className="text-xs text-yellow-400 mt-2">
                Activa un collector antes de añadir equipos.
              </p>
            )}
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={critical}
              onChange={(e) => setCritical(e.target.checked)}
              className="rounded border-card"
            />
            <span className="text-sm">
              Crítico para la exposición (alertas prioritarias)
            </span>
          </label>
        </div>
      )}

      {step === 4 && typeOption && (
        <div className="rounded-xl border border-card bg-card p-6 space-y-3 text-sm">
          <SummaryRow label="Tipo" value={typeOption.label} />
          <SummaryRow label="Nombre" value={name} />
          <SummaryRow label="IP" value={host} />
          <SummaryRow label="Protocolo" value={PROFILE_LABELS[profile]} />
          <SummaryRow label="Marca / modelo" value={[brand, model].filter(Boolean).join(" ") || "—"} />
          <SummaryRow label="Crítico" value={critical ? "Sí" : "No"} />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          disabled={step === 1}
          onClick={() => setStep((s) => (s - 1) as Step)}
          className="inline-flex items-center gap-2 rounded-lg border border-card px-4 py-2 text-sm disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </button>

        {step < 4 ? (
          <button
            type="button"
            disabled={step === 1 && !deviceType}
            onClick={() => setStep((s) => (s + 1) as Step)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-40"
          >
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Guardar equipo
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-[var(--card-border)] last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
