"use client";

import { createClient } from "@/lib/supabase/client";
import { Plus, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function VenuesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [venues, setVenues] = useState<
    Array<{ id: string; name: string; address: string | null; roomCount: number; deviceCount: number }>
  >([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .single();
    if (!profile) return;
    setOrgId(profile.organization_id);

    const { data: venueRows } = await supabase
      .from("venues")
      .select("id, name, address")
      .order("name");

    const { data: rooms } = await supabase.from("rooms").select("id, venue_id");
    const { data: devices } = await supabase.from("av_devices").select("id, venue_id");

    setVenues(
      (venueRows ?? []).map((v) => ({
        ...v,
        roomCount: rooms?.filter((r) => r.venue_id === v.id).length ?? 0,
        deviceCount: devices?.filter((d) => d.venue_id === v.id).length ?? 0,
      })),
    );
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function createVenue(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !name.trim()) return;
    setLoading(true);
    await supabase.from("venues").insert({
      organization_id: orgId,
      name: name.trim(),
      address: address.trim() || null,
    });
    setName("");
    setAddress("");
    setShowForm(false);
    setLoading(false);
    load();
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Salas y venues</h2>
          <p className="text-muted mt-1">
            Organiza tu museo por edificios, plantas y galerías.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Nuevo venue
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={createVenue}
          className="rounded-xl border border-card bg-card p-6 space-y-4 max-w-lg"
        >
          <h3 className="font-semibold">Crear venue</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Edificio principal"
            required
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Dirección (opcional)"
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-card px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!venues.length ? (
        <div className="rounded-xl border border-dashed border-card p-12 text-center">
          <Building2 className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-muted">Crea tu primer venue para organizar salas.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {venues.map((v) => (
            <Link
              key={v.id}
              href={`/app/venues/${v.id}`}
              className="rounded-xl border border-card bg-card p-5 hover:border-blue-600/40 transition-colors"
            >
              <p className="font-semibold text-lg">{v.name}</p>
              {v.address && (
                <p className="text-sm text-muted mt-1">{v.address}</p>
              )}
              <div className="flex gap-4 mt-4 text-sm text-muted">
                <span>{v.roomCount} salas</span>
                <span>{v.deviceCount} equipos</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
