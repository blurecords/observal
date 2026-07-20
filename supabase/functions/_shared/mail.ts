interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("ALERTS_FROM_EMAIL") ?? "Observal <onboarding@resend.dev>";

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

export async function sendSlaReportEmail(params: {
  to: string;
  orgName: string;
  periodLabel: string;
  overallUptime: number;
  targetPct: number;
  deviceCount: number;
  alertCount: number;
}): Promise<boolean> {
  const appUrl = Deno.env.get("APP_URL") ?? "https://observal.app";
  const { to, orgName, periodLabel, overallUptime, targetPct, deviceCount, alertCount } =
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
        <p>Objetivo SLA: <strong>${targetPct}%</strong> — ${met ? "Cumplido" : "Por debajo del objetivo"}</p>
        <ul style="font-size:14px;line-height:1.8">
          <li>Equipos monitorizados: ${deviceCount}</li>
          <li>Alertas en el periodo: ${alertCount}</li>
        </ul>
        <p style="margin-top:24px">
          <a href="${appUrl}/app/reports/sla" style="color:#2563eb">Ver detalle en Observal</a>
        </p>
      </div>
    `,
  });
}
