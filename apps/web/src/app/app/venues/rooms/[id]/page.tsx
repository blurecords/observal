import Link from "next/link";
import { StatusBadge } from "@/components/app/status-badge";
import { DEVICE_TYPES } from "@/lib/av-catalog";
import { createClient } from "@/lib/supabase/server";
import { relationName } from "@/lib/supabase/helpers";
import { Plus } from "lucide-react";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, floor, description, venues(name, id)")
    .eq("id", id)
    .single();

  const { data: devices } = await supabase
    .from("av_devices")
    .select("id, name, host, device_type, profile, last_status, critical, brand, model")
    .eq("room_id", id)
    .order("name");

  const venue = room?.venues as { name: string; id: string } | { name: string; id: string }[] | null;
  const venueName = relationName(venue);
  const venueId = Array.isArray(venue) ? venue[0]?.id : venue?.id;

  const typeLabels = Object.fromEntries(DEVICE_TYPES.map((t) => [t.id, t.label]));

  return (
    <div className="space-y-6">
      <div>
        {venueId && (
          <Link href={`/app/venues/${venueId}`} className="text-sm text-muted hover:text-white">
            ← {venueName}
          </Link>
        )}
        <h2 className="text-2xl font-bold mt-2">{room?.name}</h2>
        {room?.floor && (
          <p className="text-muted text-sm">Planta {room.floor}</p>
        )}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Equipos en esta sala</h3>
        <Link
          href="/app/devices/add"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Añadir equipo
        </Link>
      </div>

      {!devices?.length ? (
        <p className="text-muted text-sm">No hay equipos en esta sala.</p>
      ) : (
        <div className="rounded-xl border border-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card border-b border-card">
              <tr className="text-left text-muted">
                <th className="px-5 py-3">Equipo</th>
                <th className="px-5 py-3 hidden md:table-cell">Tipo</th>
                <th className="px-5 py-3 hidden lg:table-cell">IP</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {devices.map((d) => (
                <tr key={d.id} className="hover:bg-card/50">
                  <td className="px-5 py-4">
                    <Link href={`/app/devices/${d.id}`} className="font-medium hover:text-blue-400">
                      {d.name}
                      {d.critical && (
                        <span className="ml-2 text-xs text-yellow-400">crítico</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-muted">
                    {typeLabels[d.device_type] ?? d.device_type}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell font-mono text-xs">
                    {d.host}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={d.last_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
