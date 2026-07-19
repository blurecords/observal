import { createClient } from "@/lib/supabase/server";
import { relationName } from "@/lib/supabase/helpers";

const statusColors: Record<string, string> = {
  online: "bg-green-500/20 text-green-400",
  offline: "bg-red-500/20 text-red-400",
  warning: "bg-yellow-500/20 text-yellow-400",
  critical: "bg-red-500/20 text-red-400",
  unknown: "bg-gray-500/20 text-gray-400",
};

const typeLabels: Record<string, string> = {
  projector: "Proyector",
  led_processor: "Procesador LED",
  led_panel: "Panel LED",
  video_matrix: "Matriz AV",
  audio_mixer: "Mesa de sonido",
  lighting_desk: "Mesa de luces",
  lighting_node: "Nodo de luces",
  amplifier: "Amplificador",
  dsp: "DSP",
  speaker_zone: "Zona PA",
  media_player: "Media player",
  show_controller: "Control show",
  generic_av: "AV genérico",
};

export default async function DevicesPage() {
  const supabase = await createClient();
  const { data: devices } = await supabase
    .from("av_devices")
    .select("id, name, host, device_type, profile, brand, model, last_status, critical, rooms(name)")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Equipos AV</h2>
        <p className="text-muted mt-1">
          Inventario de equipamiento monitorizado en el museo.
        </p>
      </div>

      {!devices?.length ? (
        <div className="rounded-xl border border-dashed border-card p-12 text-center">
          <p className="text-muted">
            Aún no hay equipos. Activa un collector y añade dispositivos.
          </p>
          <p className="text-sm text-muted mt-2">
            El wizard de alta de equipos llegará en la Fase 6.
          </p>
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
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted">
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
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full ${statusColors[d.last_status] ?? statusColors.unknown}`}
                    >
                      {d.last_status}
                    </span>
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
