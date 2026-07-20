"use client";

import { WriteGate } from "@/components/app/role-context";
import Link from "next/link";
import { Plus, Radio } from "lucide-react";

export function CollectorsActivateButton() {
  return (
    <WriteGate>
      <Link
        href="/app/collectors/activate"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
      >
        <Plus className="h-4 w-4" />
        Activar collector
      </Link>
    </WriteGate>
  );
}

export function CollectorsEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-card p-12 text-center">
      <Radio className="h-12 w-12 text-muted mx-auto mb-4" />
      <p className="text-muted">No hay collectors activados.</p>
      <WriteGate>
        <Link
          href="/app/collectors/activate"
          className="inline-block mt-4 text-sm text-blue-400 hover:underline"
        >
          Activar el primero →
        </Link>
      </WriteGate>
    </div>
  );
}
