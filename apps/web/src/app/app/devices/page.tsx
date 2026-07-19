import Link from "next/link";
import { StatusBadge } from "@/components/app/status-badge";
import { DEVICE_TYPES } from "@/lib/av-catalog";
import { createClient } from "@/lib/supabase/server";
import { relationName } from "@/lib/supabase/helpers";
import { Plus } from "lucide-react";

export default async function DevicesPage() {
  const supabase = await createClient();
  const { data: devices } = await supabase
    .from("av_devices")
    .select(
      "id, name, host, device_type, profile, brand, model, last_status, critical, rooms(name)",
    )
    .order("name");

  const typeLabels = Object.fromEntries(DEVICE_TYPES.map((t) => [t.id, t.label]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Equipos AV</h2>
          <p className="text-muted mt-1">
            Inventario de equipamiento monitorizado en el museo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/devices/import"
            className="inline-flex items-center gap-2 rounded-lg border border-card px-4 py-2 text-sm hover:bg-card"
          >
            Importar CSV
          </Link>
          <Link
            href="/app/devices/add"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Añadir equipo
          </Link>
        </div>
      </div>

      {!devices?.length ? (
        <div className="rounded-xl border border-dashed border-card p-12 text-center">
          <p className="text-muted">Aún no hay equipos registrados.</p>
          <Link
            href="/app/devices/add"
            className="inline-block mt-4 text-sm text-blue-400 hover:underline"
          >
            Añadir el primero →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card border-b border-card">
              <tr className="text-left text-muted">
                <th className="px-5 py-3 font-medium">Equipo</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Tipo</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">IP</th>
                <th className="px-5 py-3 font-medium hidden lg:table-cell">Sala</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--card-border)]">
              {devices.map((d) => (
                <tr key={d.id} className="hover:bg-card/50">
                  <td className="px-5 py-4">
                    <Link
                      href={`/app/devices/${d.id}`}
                      className="font-medium hover:text-blue-400"
                    >
                      {d.name}
                      {d.critical && (
                        <span className="ml-2 text-xs text-yellow-400">crítico</span>
                      )}
                    </Link>
                    <p className="text-xs text-muted mt-0.5">
                      {[d.brand, d.model].filter(Boolean).join(" ") || d.profile}
                    </p>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell text-muted">
                    {typeLabels[d.device_type] ?? d.device_type}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell font-mono text-xs">
                    {d.host}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell text-muted">
                    {relationName(d.rooms as { name: string } | { name: string }[] | null) ?? "—"}
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
