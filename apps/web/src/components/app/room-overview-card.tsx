import Link from "next/link";
import { StatusBadge } from "@/components/app/status-badge";
import { cn } from "@/lib/utils";

interface RoomOverviewCardProps {
  id: string;
  name: string;
  floor?: string | null;
  online: number;
  total: number;
  hasCriticalOffline?: boolean;
}

export function RoomOverviewCard({
  id,
  name,
  floor,
  online,
  total,
  hasCriticalOffline,
}: RoomOverviewCardProps) {
  const allOnline = total > 0 && online === total;
  const status = total === 0 ? "unknown" : allOnline ? "online" : hasCriticalOffline ? "critical" : online === 0 ? "offline" : "warning";

  return (
    <Link
      href={`/app/venues/rooms/${id}`}
      className={cn(
        "block rounded-xl border border-card bg-card p-5 hover:border-blue-600/40 transition-colors",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{name}</p>
          {floor && <p className="text-xs text-muted mt-0.5">Planta {floor}</p>}
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-4 text-2xl font-bold">
        {online}
        <span className="text-muted text-base font-normal">/{total}</span>
      </p>
      <p className="text-xs text-muted mt-1">equipos online</p>
    </Link>
  );
}
