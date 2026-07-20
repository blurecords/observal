"use client";

import {
  createInvite,
  removeMember,
  revokeInvite,
  updateMemberRole,
} from "@/actions/team";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type UserRole } from "@/lib/roles";
import { Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Member {
  id: string;
  full_name: string | null;
  role: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  token: string;
}

export function TeamSettings({
  members,
  invites,
  currentUserId,
}: {
  members: Member[];
  invites: Invite[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"integrator" | "viewer">("integrator");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInviteUrl(null);
    const result = await createInvite(email, inviteRole);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("inviteUrl" in result && result.inviteUrl) {
      setInviteUrl(result.inviteUrl);
      setEmail("");
      if ("emailed" in result && result.emailed) {
        setMessage("Invitación enviada por email.");
      }
    }
    router.refresh();
  }

  async function handleRevokeInvite(id: string) {
    await revokeInvite(id);
    router.refresh();
  }

  async function handleRoleChange(memberId: string, role: "integrator" | "viewer") {
    const result = await updateMemberRole(memberId, role);
    if ("error" in result && result.error) setError(result.error);
    router.refresh();
  }

  async function handleRemove(memberId: string) {
    if (!confirm("¿Eliminar este miembro del equipo?")) return;
    const result = await removeMember(memberId);
    if ("error" in result && result.error) setError(result.error);
    router.refresh();
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="rounded-xl border border-card bg-card p-6 space-y-6">
      <div>
        <h3 className="font-semibold">Equipo</h3>
        <p className="text-sm text-muted mt-1">
          Invita integradores AV o usuarios de solo lectura a tu organización.
        </p>
      </div>

      <div className="space-y-3">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-[var(--card-border)] last:border-0"
          >
            <div>
              <p className="font-medium text-sm">{m.full_name ?? "Usuario"}</p>
              <p className="text-xs text-muted">
                {ROLE_LABELS[parseRoleSafe(m.role)]}
                {m.id === currentUserId ? " · tú" : ""}
              </p>
            </div>
            {m.role === "owner" ? (
              <span className="text-xs text-blue-400">Propietario</span>
            ) : m.id !== currentUserId ? (
              <div className="flex items-center gap-2">
                <select
                  value={m.role}
                  onChange={(e) =>
                    handleRoleChange(m.id, e.target.value as "integrator" | "viewer")
                  }
                  className="rounded-lg border border-card bg-[#0a0f1a] px-2 py-1 text-xs"
                >
                  <option value="integrator">Integrador AV</option>
                  <option value="viewer">Solo lectura</option>
                </select>
                <button
                  type="button"
                  onClick={() => handleRemove(m.id)}
                  className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Invitaciones pendientes</p>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-2 text-sm rounded-lg bg-[#0a0f1a] px-3 py-2"
              >
                <div>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted" />
                    {inv.email}
                  </span>
                  <p className="text-xs text-muted mt-0.5">
                    {ROLE_LABELS[inv.role as UserRole]} · expira{" "}
                    {new Date(inv.expires_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(`${appUrl}/invite/${inv.token}`)
                    }
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Copiar enlace
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleInvite} className="space-y-3 pt-2 border-t border-[var(--card-border)]">
        <p className="text-sm font-medium flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-blue-400" />
          Invitar miembro
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tecnico@empresa.com"
            required
            className="flex-1 rounded-lg border border-card bg-[#0a0f1a] px-4 py-2 text-sm"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "integrator" | "viewer")}
            className="rounded-lg border border-card bg-[#0a0f1a] px-3 py-2 text-sm"
          >
            <option value="integrator">Integrador AV</option>
            <option value="viewer">Solo lectura</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invitar"}
          </button>
        </div>
        <p className="text-xs text-muted">{ROLE_DESCRIPTIONS[inviteRole]}</p>
      </form>

      {message && (
        <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
          {message}
        </p>
      )}

      {inviteUrl && !message && (
        <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 break-all">
          Enlace de invitación copiado — compártelo con el invitado:
          <br />
          <span className="text-blue-300">{inviteUrl}</span>
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}
    </div>
  );
}

function parseRoleSafe(role: string): UserRole {
  if (role === "integrator" || role === "viewer") return role;
  return "owner";
}
