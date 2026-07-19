import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Plus, Radio, Server } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: collectors } = await supabase
    .from("collectors")
    .select("id, name, status, last_seen_at")
    .order("created_at", { ascending: false });

  const { data: devices } = await supabase
    .from("av_devices")
    .select("id, last_status")
    .eq("enabled", true);

  const { data: alerts } = await supabase
    .from("alerts")
    .select("id")
    .eq("resolved", false);

  const onlineDevices =
    devices?.filter((d) => d.last_status === "online").length ?? 0;
  const totalDevices = devices?.length ?? 0;
  const activeCollectors =
    collectors?.filter((c) => c.status === "active").length ?? 0;

  const stats = [
    {
      label: "Equipos online",
      value: `${onlineDevices}/${totalDevices}`,
      icon: Server,
      color: "text-green-400",
    },
    {
      label: "Collectors activos",
      value: activeCollectors,
      icon: Radio,
      color: "text-blue-400",
    },
    {
      label: "Alertas abiertas",
      value: alerts?.length ?? 0,
      icon: AlertTriangle,
      color: "text-yellow-400",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Command Center</h2>
        <p className="text-muted mt-1">
          Vista general del AV de tu museo en tiempo real.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-card bg-card p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{label}</span>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {!collectors?.length && (
        <div className="rounded-xl border border-dashed border-card bg-card/50 p-8 text-center">
          <Radio className="h-10 w-10 text-blue-400 mx-auto mb-4" />
          <h3 className="font-semibold text-lg">Activa tu primer collector</h3>
          <p className="text-muted text-sm mt-2 max-w-md mx-auto">
            Conecta la Raspberry Pi a la red del museo e introduce el código
            de la etiqueta para empezar.
          </p>
          <Link
            href="/app/collectors/activate"
            className="inline-flex items-center gap-2 mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Activar collector
          </Link>
        </div>
      )}

      {!!collectors?.length && (
        <div className="rounded-xl border border-card bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-card">
            <h3 className="font-semibold">Collectors</h3>
          </div>
          <div className="divide-y divide-[var(--card-border)]">
            {collectors.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <p className="font-medium">{c.name ?? "Observal Collector"}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {c.last_seen_at
                      ? `Última conexión: ${new Date(c.last_seen_at).toLocaleString("es-ES")}`
                      : "Sin conexión aún"}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    c.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : c.status === "online_unclaimed"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
