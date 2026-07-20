import Link from "next/link";
import { CollectorsActivateButton, CollectorsEmptyState } from "@/components/app/collectors-actions";
import { createClient } from "@/lib/supabase/server";
import { relationName } from "@/lib/supabase/helpers";

export default async function CollectorsPage() {
  const supabase = await createClient();
  const { data: collectors } = await supabase
    .from("collectors")
    .select("id, name, status, venue_id, last_seen_at, firmware_version, venues(name)")
    .order("created_at", { ascending: false });

  const grouped = new Map<string, typeof collectors>();
  for (const c of collectors ?? []) {
    const venueName =
      relationName(c.venues as { name: string } | { name: string }[] | null) ??
      "Sin venue asignado";
    if (!grouped.has(venueName)) grouped.set(venueName, []);
    grouped.get(venueName)!.push(c);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Collectors</h2>
          <p className="text-muted mt-1">
            Raspberry Pis por venue — varias Pis por instalación.
          </p>
        </div>
        <CollectorsActivateButton />
      </div>

      {!collectors?.length ? (
        <CollectorsEmptyState />
      ) : (
        [...grouped.entries()].map(([venueName, items]) => (
          <div key={venueName}>
            <h3 className="font-semibold text-sm text-muted mb-3 uppercase tracking-wide">
              {venueName} · {items?.length ?? 0} collector
              {(items?.length ?? 0) !== 1 ? "s" : ""}
            </h3>
            <div className="grid gap-3">
              {items?.map((c) => (
                <Link
                  key={c.id}
                  href={`/app/collectors/${c.id}`}
                  className="rounded-xl border border-card bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-600/40 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{c.name ?? "Observal Collector"}</p>
                    <p className="text-sm text-muted mt-1">
                      v{c.firmware_version ?? "?"}
                      {c.last_seen_at &&
                        ` · ${new Date(c.last_seen_at).toLocaleString("es-ES")}`}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${
                      c.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {c.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
