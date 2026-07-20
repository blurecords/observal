"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  userEmail?: string;
  roleLabel?: string;
}

export function AppHeader({ title, subtitle, userEmail, roleLabel }: AppHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="flex items-center justify-between border-b border-card px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {roleLabel && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-600/20 text-blue-300 hidden sm:inline">
            {roleLabel}
          </span>
        )}
        {userEmail && (
          <span className="text-sm text-muted hidden sm:block">{userEmail}</span>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-lg border border-card px-3 py-2 text-sm text-muted hover:text-white hover:bg-card transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Salir
        </button>
      </div>
    </header>
  );
}
