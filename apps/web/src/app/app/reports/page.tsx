import Link from "next/link";
import { FileSpreadsheet, Printer } from "lucide-react";

const exports = [
  {
    href: "/api/reports/inventory",
    title: "Inventario AV",
    description: "Todos los equipos con estado, venue y sala.",
  },
  {
    href: "/api/reports/alerts",
    title: "Alertas (30 días)",
    description: "Historial de alertas con severidad y resolución.",
  },
  {
    href: "/api/reports/uptime",
    title: "Disponibilidad (7 días)",
    description: "Uptime % por equipo basado en métricas device.reachable.",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">Informes y exportación</h2>
        <p className="text-muted mt-1">
          Descarga CSV para integradores o imprime el resumen de salud AV.
        </p>
      </div>

      <div className="grid gap-4">
        {exports.map(({ href, title, description }) => (
          <a
            key={href}
            href={href}
            className="rounded-xl border border-card bg-card p-5 flex items-start gap-4 hover:border-blue-600/40 transition-colors"
          >
            <FileSpreadsheet className="h-8 w-8 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted mt-1">{description}</p>
              <p className="text-xs text-blue-400 mt-2">Descargar CSV →</p>
            </div>
          </a>
        ))}
      </div>

      <div className="rounded-xl border border-card bg-card p-6">
        <div className="flex items-center gap-3 mb-3">
          <Printer className="h-5 w-5 text-blue-400" />
          <h3 className="font-semibold">Informe de salud (imprimir / PDF)</h3>
        </div>
        <p className="text-sm text-muted mb-4">
          Vista imprimible del Command Center — usa &quot;Imprimir&quot; del navegador
          y guarda como PDF.
        </p>
        <Link
          href="/app/reports/print"
          className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        >
          Abrir informe imprimible
        </Link>
      </div>
    </div>
  );
}
