import { PrintButton } from "@/components/app/print-button";
import { relationName } from "@/lib/supabase/helpers";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PrintableReportPage() {
  const supabase = await createClient();
  const generatedAt = new Date().toLocaleString("es-ES");

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .single();

  const { data: devices } = await supabase
    .from("av_devices")
    .select("id, name, last_status, critical")
    .eq("enabled", true)
    .order("name");

  const { data: collectors } = await supabase
    .from("collectors")
    .select("id, name, status, venues(name)")
    .order("name");

  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, title, severity, created_at")
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const online = devices?.filter((d) => d.last_status === "online").length ?? 0;
  const total = devices?.length ?? 0;
  const activeCollectors = collectors?.filter((c) => c.status === "active").length ?? 0;

  return (
    <div className="min-h-screen bg-white text-black p-8 print:p-4">
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/app/reports" className="text-sm text-blue-600 hover:underline">
          ← Informes
        </Link>
        <PrintButton />
      </div>

      <header className="border-b border-gray-300 pb-4 mb-6">
        <h1 className="text-2xl font-bold">Observal — Informe de salud AV</h1>
        <p className="text-gray-600 text-sm mt-1">
          {org?.name ?? "Organización"} · Generado: {generatedAt}
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Equipos online" value={`${online}/${total}`} />
        <StatCard label="Collectors activos" value={String(activeCollectors)} />
        <StatCard label="Alertas abiertas" value={String(alerts?.length ?? 0)} />
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">Collectors por venue</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-left">
              <th className="py-2 pr-4">Collector</th>
              <th className="py-2 pr-4">Venue</th>
              <th className="py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(collectors ?? []).map((c) => {
              const venue = relationName(
                c.venues as { name: string } | { name: string }[] | null,
              );
              return (
                <tr key={c.id} className="border-b border-gray-200">
                  <td className="py-2 pr-4">{c.name ?? "Observal Collector"}</td>
                  <td className="py-2 pr-4">{venue ?? "—"}</td>
                  <td className="py-2">{c.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-lg mb-3">Equipos AV</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-left">
              <th className="py-2 pr-4">Equipo</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2">Crítico</th>
            </tr>
          </thead>
          <tbody>
            {(devices ?? []).map((d) => (
              <tr key={d.id} className="border-b border-gray-200">
                <td className="py-2 pr-4">{d.name}</td>
                <td className="py-2 pr-4">{d.last_status}</td>
                <td className="py-2">{d.critical ? "Sí" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {!!alerts?.length && (
        <section>
          <h2 className="font-semibold text-lg mb-3">Alertas abiertas</h2>
          <ul className="text-sm space-y-2">
            {alerts.map((a) => (
              <li key={a.id} className="border-b border-gray-200 pb-2">
                <strong>{a.title}</strong>
                <span className="text-gray-600 ml-2">({a.severity})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-300 rounded-lg p-4">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
