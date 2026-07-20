"use client";

import { ALERT_RULES, type AlertRuleKey } from "@/lib/alert-rules";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function NotificationSettings() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [lampHours, setLampHours] = useState(1800);
  const [preOpening, setPreOpening] = useState(30);
  const [retentionDays, setRetentionDays] = useState(90);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();
      if (!profile) return;
      setOrgId(profile.organization_id);

      const { data: org } = await supabase
        .from("organizations")
        .select(
          "notification_email, alerts_email_enabled, lamp_hours_warning, pre_opening_alert_minutes, metrics_retention_days",
        )
        .eq("id", profile.organization_id)
        .single();

      if (org) {
        setEmail(org.notification_email ?? "");
        setEnabled(org.alerts_email_enabled ?? true);
        setLampHours(org.lamp_hours_warning ?? 1800);
        setPreOpening(org.pre_opening_alert_minutes ?? 30);
        setRetentionDays(org.metrics_retention_days ?? 90);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    await supabase
      .from("organizations")
      .update({
        notification_email: email.trim() || null,
        alerts_email_enabled: enabled,
        lamp_hours_warning: lampHours,
        pre_opening_alert_minutes: preOpening,
        metrics_retention_days: retentionDays,
      })
      .eq("id", orgId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return <p className="text-sm text-muted">Cargando…</p>;
  }

  return (
    <form onSubmit={save} className="rounded-xl border border-card bg-card p-6 space-y-4">
      <h3 className="font-semibold">Notificaciones por email</h3>
      <p className="text-sm text-muted">
        Recibe alertas críticas de tus sistemas AV en tu bandeja de entrada.
      </p>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span className="text-sm">Activar emails de alerta</span>
      </label>

      <div>
        <label className="block text-sm font-medium mb-2">Email de notificaciones</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tecnico@tuempresa.com"
          className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Umbral horas lámpara
          </label>
          <input
            type="number"
            value={lampHours}
            onChange={(e) => setLampHours(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Minutos antes de apertura (alerta crítica)
          </label>
          <input
            type="number"
            value={preOpening}
            onChange={(e) => setPreOpening(parseInt(e.target.value, 10) || 0)}
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Retención de métricas (días)
          </label>
          <input
            type="number"
            min={7}
            max={365}
            value={retentionDays}
            onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 90)}
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <p className="text-xs text-muted mt-1">
            Datos más antiguos se purgan automáticamente cada noche.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saved ? "Guardado ✓" : "Guardar notificaciones"}
      </button>
    </form>
  );
}

export function AlertRulesSettings() {
  const supabase = createClient();
  const [rules, setRules] = useState<
    Array<{ id: string; rule_key: string; enabled: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();
      if (!profile) return;

      const { data } = await supabase
        .from("alert_rules")
        .select("id, rule_key, enabled")
        .eq("organization_id", profile.organization_id);

      setRules(data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function toggle(id: string, enabled: boolean) {
    await supabase.from("alert_rules").update({ enabled }).eq("id", id);
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled } : r)),
    );
  }

  if (loading) return null;

  return (
    <div className="rounded-xl border border-card bg-card p-6 space-y-4">
      <h3 className="font-semibold">Reglas de alerta</h3>
      <div className="space-y-3">
        {rules.map((rule) => {
          const meta = ALERT_RULES[rule.rule_key as AlertRuleKey];
          return (
            <label
              key={rule.id}
              className="flex items-start gap-3 cursor-pointer rounded-lg border border-[var(--card-border)] p-4"
            >
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(e) => toggle(rule.id, e.target.checked)}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-sm">
                  {meta?.label ?? rule.rule_key}
                </p>
                <p className="text-xs text-muted mt-1">
                  {meta?.description ?? ""}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
