import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { relationName } from "@/lib/supabase/helpers";
import { Plus, Radio } from "lucide-react";

export default async function CollectorsPage() {
  const supabase = await createClient();
  const { data: collectors } = await supabase
    .from("collectors")
    .select("id, name, status, venue_id, last_seen_at, firmware_version, venues(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Collectors</h2>
          <p className="text-muted mt-1">
            Raspberry Pis instaladas en tus venues.
          </p>
        </div>
        <Link
          href="/app/collectors/activate"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Activar collector
        </Link>
      </div>

      {!collectors?.length ? (
        <div className="rounded-xl border border-dashed border-card p-12 text-center">
          <Radio className="h-12 w-12 text-muted mx-auto mb-4" />
          <p className="text-muted">No hay collectors activados.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {collectors.map((c) => (
            <Link
              key={c.id}
              href={`/app/collectors/${c.id}`}
              className="rounded-xl border border-card bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-600/40 transition-colors"
            >
              <div>
                <p className="font-semibold">{c.name ?? "Observal Collector"}</p>
                <p className="text-sm text-muted mt-1">
                  {relationName(c.venues as { name: string } | { name: string }[] | null) ?? "Sin venue"} · v
                  {c.firmware_version ?? "?"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full ${
                    c.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {c.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
