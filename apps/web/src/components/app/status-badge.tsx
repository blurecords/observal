import { STATUS_COLORS, STATUS_LABELS } from "@/lib/av-catalog";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-xs px-2.5 py-1 rounded-full capitalize",
        STATUS_COLORS[status] ?? STATUS_COLORS.unknown,
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
