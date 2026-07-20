"use client";

import { RoomOverviewCard } from "@/components/app/room-overview-card";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const router = useRouter();

  const [venue, setVenue] = useState<{ name: string; address: string | null } | null>(null);
  const [rooms, setRooms] = useState<
    Array<{
      id: string;
      name: string;
      floor: string | null;
      online: number;
      total: number;
      criticalOffline: boolean;
    }>
  >([]);
  const [showForm, setShowForm] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [floor, setFloor] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .single();
    setOrgId(profile?.organization_id ?? null);

    const { data: v } = await supabase
      .from("venues")
      .select("name, address")
      .eq("id", id)
      .single();
    setVenue(v);

    const { data: roomRows } = await supabase
      .from("rooms")
      .select("id, name, floor")
      .eq("venue_id", id)
      .order("sort_order")
      .order("name");

    const { data: devices } = await supabase
      .from("av_devices")
      .select("room_id, last_status, critical")
      .eq("venue_id", id)
      .eq("enabled", true);

    setRooms(
      (roomRows ?? []).map((r) => {
        const roomDevices = devices?.filter((d) => d.room_id === r.id) ?? [];
        return {
          ...r,
          online: roomDevices.filter((d) => d.last_status === "online").length,
          total: roomDevices.length,
          criticalOffline: roomDevices.some(
            (d) => d.critical && d.last_status !== "online",
          ),
        };
      }),
    );
  }, [id, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !roomName.trim()) return;
    await supabase.from("rooms").insert({
      organization_id: orgId,
      venue_id: id,
      name: roomName.trim(),
      floor: floor.trim() || null,
    });
    setRoomName("");
    setFloor("");
    setShowForm(false);
    load();
    router.refresh();
  }

  if (!venue) {
    return <p className="text-muted">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/venues" className="text-sm text-muted hover:text-white">
          ← Venues
        </Link>
        <h2 className="text-2xl font-bold mt-2">{venue.name}</h2>
        {venue.address && <p className="text-muted">{venue.address}</p>}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Salas y zonas</h3>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-card px-3 py-2 text-sm hover:bg-card"
        >
          <Plus className="h-4 w-4" />
          Nueva sala
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={createRoom}
          className="rounded-xl border border-card bg-card p-5 flex flex-col sm:flex-row gap-3"
        >
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Sala principal / Rack AV"
            required
            className="flex-1 rounded-lg border border-card bg-[#0a0f1a] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="Planta"
            className="w-32 rounded-lg border border-card bg-[#0a0f1a] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            Crear
          </button>
        </form>
      )}

      {!rooms.length ? (
        <p className="text-muted text-sm">Añade salas para organizar equipos por zona.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((r) => (
            <RoomOverviewCard
              key={r.id}
              id={r.id}
              name={r.name}
              floor={r.floor}
              online={r.online}
              total={r.total}
              hasCriticalOffline={r.criticalOffline}
            />
          ))}
        </div>
      )}
    </div>
  );
}
