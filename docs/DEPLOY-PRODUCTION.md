# Despliegue producción — observal.app

## Checklist Supabase

- [ ] Migraciones aplicadas (`supabase db push`)
- [ ] RLS auditado
- [ ] Google OAuth: redirect `https://observal.app/auth/callback`
- [ ] Edge Functions desplegadas (todas)
- [ ] Secrets: `RESEND_API_KEY`, `ALERTS_FROM_EMAIL`, `APP_URL`, `CRON_SECRET`, `CREDENTIALS_ENCRYPTION_KEY`
- [ ] Cron `check-collectors` cada 5 min
- [ ] Cron `purge-metrics` diario (`0 3 * * *`)
- [ ] Cron `send-sla-reports` diario (`0 8 * * *`) — envía el día configurado por org
- [ ] `RESEND_API_KEY` en Vercel (invitaciones + SLA) y Supabase (alertas + webhooks vía edge)
- [ ] Backups activados (plan Pro recomendado)

## Edge Functions

```bash
supabase functions deploy collectors-announce
supabase functions deploy collectors-poll
supabase functions deploy collectors-claim
supabase functions deploy collector-ingest
supabase functions deploy check-collectors
supabase functions deploy collectors-revoke
supabase functions deploy collectors-rotate-token
supabase functions deploy purge-metrics
supabase functions deploy send-sla-reports
```

Generar clave de cifrado de credenciales (misma en Vercel y Supabase):

```bash
openssl rand -base64 32
```

## Vercel (web)

1. Importar repo GitHub
2. Root: `apps/web`
3. Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL=https://observal.app`
   - `CREDENTIALS_ENCRYPTION_KEY` (misma clave que en Supabase Edge Functions)
   - `RESEND_API_KEY` (invitaciones de equipo e informes SLA)
   - `ALERTS_FROM_EMAIL=Observal <alerts@tu-dominio.com>`
4. Dominio custom: `observal.app`

## DNS Hostinger

| Tipo | Host | Destino |
|------|------|---------|
| A | `@` | Vercel |
| CNAME | `www` | cname.vercel-dns.com |

## Health check

```bash
curl https://observal.app/api/health
```

## Seguridad

- Rotar `service_role` si se filtró
- Revocar collectors perdidos desde `/app/collectors/[id]`
- No commitear `.env` con claves reales
