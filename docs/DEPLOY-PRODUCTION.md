# Despliegue producción — observal.app

## Checklist Supabase

- [ ] Migraciones aplicadas (`supabase db push`)
- [ ] RLS auditado
- [ ] Google OAuth: redirect `https://observal.app/auth/callback`
- [ ] Edge Functions desplegadas (todas)
- [ ] Secrets: `RESEND_API_KEY`, `ALERTS_FROM_EMAIL`, `APP_URL`, `CRON_SECRET`
- [ ] Cron `check-collectors` cada 5 min
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
```

## Vercel (web)

1. Importar repo GitHub
2. Root: `apps/web`
3. Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL=https://observal.app`
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
