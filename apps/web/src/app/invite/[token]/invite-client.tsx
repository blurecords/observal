"use client";

import { acceptInvite } from "@/actions/team";
import { ROLE_LABELS } from "@/lib/roles";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  token: string;
  invite: {
    email?: string;
    role?: string;
    accepted_at?: string | null;
    expires_at?: string;
  } | null;
  isLoggedIn: boolean;
  userEmail?: string | null;
}

export default function InviteClient({ token, invite, isLoggedIn, userEmail }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!invite?.email) {
    return (
      <Shell>
        <p className="text-red-400">Invitación no encontrada.</p>
      </Shell>
    );
  }

  if (invite.accepted_at) {
    return (
      <Shell>
        <p className="text-green-400">Esta invitación ya fue aceptada.</p>
        <Link href="/app" className="text-sm text-blue-400 hover:underline">
          Ir al Command Center →
        </Link>
      </Shell>
    );
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <Shell>
        <p className="text-red-400">La invitación ha expirado.</p>
      </Shell>
    );
  }

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const result = await acceptInvite(token);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setMessage("¡Te has unido al equipo!");
    setTimeout(() => router.push("/app"), 1200);
  }

  const roleLabel = ROLE_LABELS[invite.role as keyof typeof ROLE_LABELS] ?? invite.role;

  return (
    <Shell>
      <h1 className="text-2xl font-bold">Invitación a Observal</h1>
      <p className="text-muted text-sm">
        Rol: <strong>{roleLabel}</strong>
        <br />
        Cuenta: <strong>{invite.email}</strong>
      </p>

      {!isLoggedIn ? (
        <Link
          href={`/login?next=/invite/${token}`}
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-500"
        >
          Iniciar sesión con Google
        </Link>
      ) : userEmail?.toLowerCase() !== invite.email.toLowerCase() ? (
        <p className="text-yellow-400 text-sm">
          Has iniciado sesión como {userEmail}. Cierra sesión e inicia con {invite.email}.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleAccept}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Aceptar invitación"}
        </button>
      )}

      {message && <p className="text-green-400 text-sm">{message}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#060912]">
      <div className="max-w-md w-full rounded-xl border border-card bg-card p-8 space-y-6 text-center">
        {children}
      </div>
    </div>
  );
}
