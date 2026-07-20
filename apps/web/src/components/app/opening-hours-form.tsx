"use client";

import { saveOpeningHours } from "@/actions/settings";
import { DAY_LABELS } from "@/lib/alert-rules";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface VenueOption {
  id: string;
  name: string;
}

interface HourRow {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  id?: string;
}

const DEFAULT_HOURS: HourRow[] = Array.from({ length: 7 }, (_, day) => ({
  day_of_week: day,
  opens_at: "10:00",
  closes_at: "18:00",
}));

export function OpeningHoursSettings() {
  const supabase = createClient();
  const [venues, setVenues] = useState<VenueOption[]>([]);
  const [venueId, setVenueId] = useState("");
  const [hours, setHours] = useState<HourRow[]>(DEFAULT_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadHours = useCallback(
    async (vId: string) => {
      const { data } = await supabase
        .from("opening_hours")
        .select("id, day_of_week, opens_at, closes_at")
        .eq("venue_id", vId);

      if (data?.length) {
        const merged = DEFAULT_HOURS.map((d) => {
          const found = data.find((h) => h.day_of_week === d.day_of_week);
          return found
            ? {
                id: found.id,
                day_of_week: found.day_of_week,
                opens_at: found.opens_at.slice(0, 5),
                closes_at: found.closes_at.slice(0, 5),
              }
            : d;
        });
        setHours(merged);
      } else {
        setHours(DEFAULT_HOURS);
      }
    },
    [supabase],
  );

  useEffect(() => {
    async function init() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();
      if (!profile) return;

      const { data: v } = await supabase
        .from("venues")
        .select("id, name")
        .order("name");
      setVenues(v ?? []);
      if (v?.[0]) {
        setVenueId(v[0].id);
        await loadHours(v[0].id);
      }
      setLoading(false);
    }
    init();
  }, [supabase, loadHours]);

  useEffect(() => {
    if (venueId) loadHours(venueId);
  }, [venueId, loadHours]);

  function updateHour(day: number, field: "opens_at" | "closes_at", value: string) {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === day ? { ...h, [field]: value } : h)),
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!venueId) return;
    setSaving(true);

    const venueName = venues.find((v) => v.id === venueId)?.name ?? "Venue";
    await saveOpeningHours(venueId, venueName, hours);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadHours(venueId);
  }

  if (loading) return <p className="text-sm text-muted">Cargando horarios…</p>;

  if (!venues.length) {
    return (
      <div className="rounded-xl border border-dashed border-card p-6 text-sm text-muted">
        Crea un venue en Salas y venues para configurar horarios de apertura.
      </div>
    );
  }

  return (
    <form onSubmit={save} className="rounded-xl border border-card bg-card p-6 space-y-4">
      <h3 className="font-semibold">Horario de apertura</h3>
      <p className="text-sm text-muted">
        Las alertas críticas usan este horario para avisar antes de abrir al público.
      </p>

      <select
        value={venueId}
        onChange={(e) => setVenueId(e.target.value)}
        className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-2 text-sm"
      >
        {venues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>

      <div className="space-y-2">
        {hours.map((h) => (
          <div
            key={h.day_of_week}
            className="grid grid-cols-[100px_1fr_1fr] gap-3 items-center text-sm"
          >
            <span className="text-muted">{DAY_LABELS[h.day_of_week]}</span>
            <input
              type="time"
              value={h.opens_at}
              onChange={(e) => updateHour(h.day_of_week, "opens_at", e.target.value)}
              className="rounded-lg border border-card bg-[#0a0f1a] px-3 py-2"
            />
            <input
              type="time"
              value={h.closes_at}
              onChange={(e) => updateHour(h.day_of_week, "closes_at", e.target.value)}
              className="rounded-lg border border-card bg-[#0a0f1a] px-3 py-2"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saved ? "Guardado ✓" : "Guardar horarios"}
      </button>
    </form>
  );
}
