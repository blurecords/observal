# Aplicar migraciones en Supabase (primera vez)

Si el login falla con:

```text
Database error saving new user
relation "organizations" does not exist
```

**No hay tablas de Observal en la base de datos.** Hay que aplicar todas las migraciones.

Proyecto: `kcaiuodwgthpsxoqlccg` (observal.app)

---

## Opción A — CLI (recomendada)

```bash
cd /Users/operador/Projects/observal

# Si no has hecho login antes
supabase login

# Enlazar proyecto (si no está enlazado)
supabase link --project-ref kcaiuodwgthpsxoqlccg

# Aplicar TODAS las migraciones en orden
supabase db push
```

Te pedirá la contraseña de la base de datos (Supabase Dashboard → Project Settings → Database → Database password).

---

## Opción B — SQL Editor (manual)

Supabase Dashboard → **SQL Editor** → ejecutar **cada archivo en este orden**:

1. `supabase/migrations/20250719000000_initial_schema.sql`
2. `supabase/migrations/20250719000001_pending_ingest_token.sql`
3. `supabase/migrations/20250719100000_config_bump_trigger.sql`
4. `supabase/migrations/20250719200000_sprint3_alerts.sql`
5. `supabase/migrations/20250719300000_device_test.sql`
6. `supabase/migrations/20250720100000_sprint7_retention_alerts.sql`
7. `supabase/migrations/20250721100000_sprint8_rbac.sql`
8. `supabase/migrations/20250722100000_sprint9_audit_sla.sql`
9. `supabase/migrations/20250723100000_sprint10_plans_webhooks.sql`
10. `supabase/migrations/20250724100000_fix_signup_triggers.sql`

Después, ejecuta también **Sprint 8** (equipo/RBAC) si aún no lo hiciste:

`supabase/migrations/20250721100000_sprint8_rbac.sql`

O el catch-up rápido si solo tienes el schema inicial:

`docs/sql/catch-up-after-initial-schema.sql` (pegar en SQL Editor → Run)

---

## Verificar que funcionó

En SQL Editor:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'profiles', 'alert_rules')
ORDER BY tablename;
```

Deberías ver las 3 tablas.

Comprueba el trigger de registro:

```sql
SELECT tgname
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

---

## Probar login

1. Incógnito → `https://observal.app/login`
2. Google OAuth
3. Deberías llegar a `/app` con org + profile creados automáticamente

Si un intento anterior dejó un usuario huérfano en Auth sin profile, bórralo en **Authentication → Users** y vuelve a probar.

---

## Después de las migraciones

Despliega Edge Functions (ver [DEPLOY-PRODUCTION.md](./DEPLOY-PRODUCTION.md)):

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
