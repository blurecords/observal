"use client";

import { UptimeBar } from "@/components/charts/metrics-chart";

interface DashboardChartsProps {
  rooms: Array<{ name: string; online: number; total: number }>;
}

export function DashboardRoomBars({ rooms }: DashboardChartsProps) {
  if (!rooms.length) return null;

  return (
    <div className="rounded-xl border border-card bg-card p-5 space-y-4">
      <h3 className="font-semibold">Disponibilidad por sala</h3>
      {rooms.map((r) => (
        <UptimeBar
          key={r.name}
          label={r.name}
          online={r.online}
          total={r.total}
        />
      ))}
    </div>
  );
}
