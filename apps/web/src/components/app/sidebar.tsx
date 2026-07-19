"use client";

import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  LayoutDashboard,
  Monitor,
  Radio,
  Server,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/app", label: "Command Center", icon: LayoutDashboard },
  { href: "/app/collectors", label: "Collectors", icon: Radio },
  { href: "/app/devices", label: "Equipos AV", icon: Server },
  { href: "/app/alerts", label: "Alertas", icon: AlertTriangle },
  { href: "/app/settings", label: "Ajustes", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-card bg-[#0a0f1a]">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-card">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Monitor className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold">Observal</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-blue-600/20 text-blue-300"
                  : "text-muted hover:text-white hover:bg-card",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
