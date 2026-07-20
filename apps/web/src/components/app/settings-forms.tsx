"use client";

import { toggleAlertRule, updateNotificationSettings } from "@/actions/settings";
import { ALERT_RULES, type AlertRuleKey } from "@/lib/alert-rules";
import { PLAN_LIMITS, parsePlan, type OrgPlan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function NotificationSettings() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<OrgPlan>("starter");
  const [email, setEmail] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [lampHours, setLampHours] = useState(1800);
  const [preOpening, setPreOpening] = useState(30);
  const [retentionDays, setRetentionDays] = useState(90);
  const [slaEnabled, setSlaEnabled] = useState(false);
  const [slaTarget, setSlaTarget] = useState(99);
  const [slaDay, setSlaDay] = useState(1);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookMinSeverity, setWebhookMinSeverity] = useState<"info" | "warning" | "critical">("warning");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .single();
      if (!profile) return;

      const { data: org } = await supabase
        .from("organizations")
        .select(
          "plan, notification_email, alerts_email_enabled, lamp_hours_warning, pre_opening_alert_minutes, metrics_retention_days, sla_report_enabled, sla_target_pct, sla_report_day, webhook_url, webhook_enabled, webhook_min_severity",
        )
        .eq("id", profile.organization_id)
        .single();

      if (org) {
        setPlan(parsePlan(org.plan));
        setEmail(org.notification_email ?? "");
        setEnabled(org.alerts_email_enabled ?? true);
        setLampHours(org.lamp_hours_warning ?? 1800);
        setPreOpening(org.pre_opening_alert_minutes ?? 30);
        setRetentionDays(org.metrics_retention_days ?? 90);
        setSlaEnabled(org.sla_report_enabled ?? false);
        setSlaTarget(org.sla_target_pct ?? 99);
        setSlaDay(org.sla_report_day ?? 1);
        setWebhookUrl(org.webhook_url ?? "");
        setWebhookEnabled(org.webhook_enabled ?? false);
        setWebhookMinSeverity(
          (org.webhook_min_severity as "info" | "warning" | "critical") ?? "warning",
        );
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);

    const result = await updateNotificationSettings({
      notification_email: email.trim() || null,
      alerts_email_enabled: enabled,
      lamp_hours_warning: lampHours,
      pre_opening_alert_minutes: preOpening,
      metrics_retention_days: retentionDays,
      sla_report_enabled: slaEnabled,
      sla_target_pct: slaTarget,
      sla_report_day: slaDay,
      webhook_url: webhookUrl.trim() || null,
      webhook_enabled: webhookEnabled,
      webhook_min_severity: webhookMinSeverity,
    });

    setSaving(false);
    if ("error" in result && result.error) {
      setNotice(result.error);
      return;
    }
    if ("retentionCapped" in result && result.retentionCapped) {
      setRetentionDays(result.maxRetention ?? retentionDays);
      setNotice(`Retención ajustada al máximo del plan (${result.maxRetention} días).`);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const maxRetention = PLAN_LIMITS[plan].maxRetentionDays;

  if (loading) {
    return <p className="text-sm text-muted">Cargando…</p>;
  }

  return (
    <form onSubmit={save} className="rounded-xl border border-card bg-card p-6 space-y-4">
      <h3 className="font-semibold">Notificaciones</h3>
      <p className="text-sm text-muted">
        Alertas por email y webhook (Slack o endpoint HTTPS).
      </p>

      <div className="space-y-3 border border-[var(--card-border)] rounded-lg p-4">
        <h4 className="font-medium text-sm">Email</h4>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span className="text-sm">Activar emails de alerta</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tecnico@tuempresa.com"
          className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      <div className="space-y-3 border border-[var(--card-border)] rounded-lg p-4">
        <h4 className="font-medium text-sm">Webhook</h4>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={webhookEnabled}
            onChange={(e) => setWebhookEnabled(e.target.checked)}
          />
          <span className="text-sm">Activar webhook de alertas</span>
        </label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <div>
          <label className="block text-sm font-medium mb-2">Severidad mínima</label>
          <select
            value={webhookMinSeverity}
            onChange={(e) =>
              setWebhookMinSeverity(e.target.value as "info" | "warning" | "critical")
            }
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-2 text-sm"
          >
            <option value="info">Info y superior</option>
            <option value="warning">Warning y superior</option>
            <option value="critical">Solo críticas</option>
          </select>
        </div>
        <p className="text-xs text-muted">
          Compatible con Slack Incoming Webhooks y endpoints JSON genéricos.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Umbral horas lámpara</label>
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
            max={maxRetention}
            value={retentionDays}
            onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || maxRetention)}
            className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <p className="text-xs text-muted mt-1">
            Máximo del plan: {maxRetention} días.
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--card-border)] pt-4 space-y-4">
        <h4 className="font-medium text-sm">Informe SLA mensual</h4>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={slaEnabled}
            onChange={(e) => setSlaEnabled(e.target.checked)}
          />
          <span className="text-sm">Enviar resumen SLA por email cada mes</span>
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Objetivo SLA (%)</label>
            <input
              type="number"
              min={80}
              max={100}
              value={slaTarget}
              onChange={(e) => setSlaTarget(parseInt(e.target.value, 10) || 99)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Día de envío (1–28)</label>
            <input
              type="number"
              min={1}
              max={28}
              value={slaDay}
              onChange={(e) => setSlaDay(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-lg border border-card bg-[#0a0f1a] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>
      </div>

      {notice && (
        <p className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3">
          {notice}
        </p>
      )}

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
    const result = await toggleAlertRule(id, enabled);
    if ("error" in result && result.error) return;
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
