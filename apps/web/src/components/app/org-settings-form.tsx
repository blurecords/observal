"use client";

import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const TIMEZONES = [
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Singapore",
];

export function OrganizationSettings() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();
      if (!profile) return;
      setOrgId(profile.organization_id);

      const { data: org } = await supabase
        .from("organizations")
        .select("name, timezone")
        .eq("id", profile.organization_id)
        .single();

      if (org) {
        setName(org.name ?? "");
        setTimezone(org.timezone ?? "Europe/Madrid");
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    await supabase
      .from("organizations")
      .update({ name: name.trim(), timezone })
      .eq("id", orgId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-sm text-muted">Cargando…</p>;

  return (
    <form onSubmit={save} className="rounded-xl border border-card bg-card p-6 space-y-4">
      <h3 className="font-semibold">Organización</h3>
      <div>
        <label className="block text-sm font-medium mb-2">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Zona horaria</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saved ? "Guardado ✓" : "Guardar"}
      </button>
    </form>
  );
}
