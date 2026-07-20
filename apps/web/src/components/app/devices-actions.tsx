"use client";

import { WriteGate } from "@/components/app/role-context";
import Link from "next/link";
import { Plus } from "lucide-react";

export function DevicesActions() {
  return (
    <WriteGate>
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
    </WriteGate>
  );
}
