"use client";

import { DEVICE_TYPES, PROFILE_LABELS, type MonitoringProfile } from "@/lib/av-catalog";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CSV_TEMPLATE = `name,device_type,host,profile,brand,model,critical
"Proyector Galería 1",projector,192.168.10.10,pjlink_class1,Panasonic,PT-RZ990,yes
"Matriz AV",video_matrix,192.168.10.20,snmp_generic,Extron,DTP CrossPoint 84,no`;

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

export default function ImportDevicesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [csv, setCsv] = useState(CSV_TEMPLATE);
  const [venueId, setVenueId] = useState("");
  const [collectorId, setCollectorId] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [venues, setVenues] = useState<Array<{ id: string; name: string }>>([]);
  const [collectors, setCollectors] = useState<Array<{ id: string; name: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();
      if (!profile) return;
      setOrgId(profile.organization_id);

      const [v, c] = await Promise.all([
        supabase.from("venues").select("id, name").order("name"),
        supabase
          .from("collectors")
          .select("id, name")
          .eq("status", "active"),
      ]);
      setVenues(v.data ?? []);
      setCollectors(c.data ?? []);
      if (v.data?.[0]) setVenueId(v.data[0].id);
      if (c.data?.[0]) setCollectorId(c.data[0].id);
    }
    load();
  }, [supabase]);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !venueId || !collectorId) {
      setError("Selecciona venue y collector.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const rows = parseCsv(csv);
    if (!rows.length) {
      setError("CSV vacío o formato incorrecto.");
      setLoading(false);
      return;
    }

    const inserts = rows.map((row) => {
      const deviceType = row.device_type || "generic_av";
      const typeDef = DEVICE_TYPES.find((t) => t.id === deviceType);
      const profile = (row.profile ||
        typeDef?.defaultProfile ||
        "ping") as MonitoringProfile;

      const metadata: Record<string, string> = {};
      if (profile.startsWith("snmp")) {
        metadata.snmp_version = "2c";
        metadata.snmp_community = row.snmp_community || "public";
      }

      return {
        organization_id: orgId,
        venue_id: venueId,
        collector_id: collectorId,
        name: row.name,
        device_type: deviceType,
        host: row.host,
        profile,
        brand: row.brand || null,
        model: row.model || null,
        critical: row.critical?.toLowerCase() === "yes",
        enabled: true,
        metadata,
      };
    });

    const { error: insertError } = await supabase.from("av_devices").insert(inserts);
    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setResult(`${inserts.length} equipos importados correctamente.`);
    setTimeout(() => router.push("/app/devices"), 2000);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/app/devices"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Equipos AV
        </Link>
        <h2 className="text-2xl font-bold">Importar inventario CSV</h2>
        <p className="text-muted mt-1">
          Carga múltiples equipos AV de una vez para el museo piloto.
        </p>
      </div>

      <div className="rounded-xl border border-card bg-card p-5 text-sm space-y-2">
        <div className="flex items-center gap-2 font-medium">
          <FileSpreadsheet className="h-4 w-4 text-blue-400" />
          Formato CSV
        </div>
        <p className="text-muted text-xs">
          Columnas: name, device_type, host, profile, brand, model, critical (yes/no)
        </p>
        <p className="text-muted text-xs">
          Perfiles: {Object.keys(PROFILE_LABELS).join(", ")}
        </p>
      </div>

      <form onSubmit={handleImport} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Venue</label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
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
            <label className="block text-sm font-medium mb-2">Collector</label>
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
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Contenido CSV</label>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={8}
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}
        {result && (
          <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
            {result}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Importar equipos
        </button>
      </form>
    </div>
  );
}
