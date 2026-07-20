"use client";

import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Building2, Radio } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [venueName, setVenueName] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("organization_id, organizations(name)")
      .single()
      .then(({ data }) => {
        if (!data) return;
        setOrgId(data.organization_id);
        const org = data.organizations as { name: string } | { name: string }[] | null;
        const name = Array.isArray(org) ? org[0]?.name : org?.name;
        if (name) setOrgName(name);
      });
  }, [supabase]);

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !orgName.trim()) return;
    setLoading(true);
    await supabase
      .from("organizations")
      .update({ name: orgName.trim() })
      .eq("id", orgId);
    setLoading(false);
    setStep(2);
  }

  async function createVenue(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !venueName.trim()) return;
    setLoading(true);
    await supabase.from("venues").insert({
      organization_id: orgId,
      name: venueName.trim(),
    });
    setLoading(false);
    setStep(3);
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 py-8">
      <div>
        <h2 className="text-2xl font-bold">Configura Observal</h2>
        <p className="text-muted mt-1">
          Prepara tu instalación AV en unos minutos. Puedes conectar la Pi más
          tarde.
        </p>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${s <= step ? "bg-blue-600" : "bg-[#1a2236]"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={saveOrg} className="rounded-xl border border-card bg-card p-6 space-y-4">
          <Building2 className="h-8 w-8 text-blue-400" />
          <h3 className="font-semibold">Tu organización</h3>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Mi empresa AV / cliente"
            required
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            Continuar
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={createVenue} className="rounded-xl border border-card bg-card p-6 space-y-4">
          <Building2 className="h-8 w-8 text-blue-400" />
          <h3 className="font-semibold">Primera sede / instalación</h3>
          <p className="text-sm text-muted">
            Edificio, venue, cliente o site. Puedes añadir más después.
          </p>
          <input
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="Sede central / Hotel XYZ / Auditorio"
            required
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            Crear sede
          </button>
        </form>
      )}

      {step === 3 && (
        <div className="rounded-xl border border-card bg-card p-6 space-y-4 text-center">
          <Radio className="h-10 w-10 text-blue-400 mx-auto" />
          <h3 className="font-semibold">Collector (Raspberry Pi)</h3>
          <p className="text-sm text-muted">
            Cuando tengas la Pi, actívala con el código de la etiqueta. Mientras
            tanto puedes explorar la plataforma y preparar el inventario AV.
          </p>
          <Link
            href="/app/collectors/activate"
            className="inline-flex items-center gap-2 rounded-lg border border-card px-4 py-2 text-sm hover:bg-[#0a0f1a]"
          >
            Activar collector
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => router.push("/app")}
            className="block w-full rounded-lg bg-blue-600 py-3 font-medium hover:bg-blue-500 mt-4"
          >
            Ir al Command Center
          </button>
          <p className="text-xs text-muted">
            Desarrollo sin Pi:{" "}
            <code className="text-blue-400">OBSERVAL_DEMO=1 python factory/simulate-collector.py</code>
          </p>
        </div>
      )}
    </div>
  );
}
