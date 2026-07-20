interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERTS_FROM_EMAIL ?? "Observal <onboarding@resend.dev>";

  if (!resendKey) {
    console.log("[email skipped]", subject, "→", to);
    return false;
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromEmail, to: [to], subject, html }),
  });

  if (!resp.ok) {
    console.error("Resend error:", await resp.text());
    return false;
  }

  return true;
}

export async function sendInviteEmail(params: {
  to: string;
  inviteUrl: string;
  orgName: string;
  roleLabel: string;
  inviterName?: string | null;
}): Promise<boolean> {
  const { to, inviteUrl, orgName, roleLabel, inviterName } = params;

  return sendEmail({
    to,
    subject: `Invitación a Observal — ${orgName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;color:#111">
        <h2 style="color:#1e40af">Observal AV</h2>
        <p>${inviterName ? `<strong>${inviterName}</strong> te ha invitado` : "Has sido invitado"} a unirte a <strong>${orgName}</strong> como <strong>${roleLabel}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${inviteUrl}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
            Aceptar invitación
          </a>
        </p>
        <p style="color:#666;font-size:12px">El enlace expira en 7 días. Si no esperabas este email, ignóralo.</p>
      </div>
    `,
  });
}

export async function sendSlaReportEmail(params: {
  to: string;
  orgName: string;
  periodLabel: string;
  overallUptime: number;
  targetPct: number;
  deviceCount: number;
  alertCount: number;
  appUrl: string;
}): Promise<boolean> {
  const { to, orgName, periodLabel, overallUptime, targetPct, deviceCount, alertCount, appUrl } =
    params;
  const met = overallUptime >= targetPct;
  const statusColor = met ? "#16a34a" : "#dc2626";

  return sendEmail({
    to,
    subject: `Informe SLA Observal — ${periodLabel} (${overallUptime}%)`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;color:#111">
        <h2 style="color:#1e40af">Informe SLA — ${orgName}</h2>
        <p style="font-size:14px;color:#666">${periodLabel}</p>
        <p style="font-size:36px;font-weight:bold;color:${statusColor};margin:16px 0">${overallUptime}%</p>
        <p>Objetivo SLA: <strong>${targetPct}%</strong> — ${met ? "✓ Cumplido" : "✗ Por debajo del objetivo"}</p>
        <ul style="font-size:14px;line-height:1.8">
          <li>Equipos monitorizados: ${deviceCount}</li>
          <li>Alertas en el periodo: ${alertCount}</li>
        </ul>
        <p style="margin-top:24px">
          <a href="${appUrl}/app/reports/sla" style="color:#2563eb">Ver detalle en Observal →</a>
        </p>
      </div>
    `,
  });
}
