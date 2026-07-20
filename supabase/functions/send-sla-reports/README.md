# send-sla-reports

Sends monthly SLA summary emails to organizations with `sla_report_enabled = true`.

Runs on the day configured in `organizations.sla_report_day` (1–28).

## Schedule (Supabase Cron)

```
0 8 * * *
```

HTTP POST with header:

```
Authorization: Bearer <CRON_SECRET>
```

Requires `RESEND_API_KEY`, `ALERTS_FROM_EMAIL`, `APP_URL`, `CRON_SECRET`.
