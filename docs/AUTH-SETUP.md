# Configuración de autenticación (Google OAuth)

Checklist para que el login con Google funcione en local y en `observal.app`.

## Flujo en Observal

```text
/login
  → signInWithOAuth (Google)
  → Google
  → Supabase Auth (/auth/v1/callback)
  → /auth/callback?code=...&next=/app
  → exchangeCodeForSession (cookies de sesión)
  → redirect a /app (o /invite/[token])
  → trigger handle_new_user → org + profile
```

## 1. Supabase Dashboard → Authentication → URL Configuration

| Campo | Valor |
|-------|-------|
| **Site URL** | `https://observal.app` (prod) o `http://localhost:3000` (dev) |
| **Redirect URLs** | Añadir **todas** las que uses (con y sin `www`): |

```
https://observal.app/auth/callback
https://www.observal.app/auth/callback
http://localhost:3000/auth/callback
```

Sin estas URLs, Supabase rechaza el redirect tras Google.

> Si tras login acabas en `/?code=...` (landing sin panel), falta `/auth/callback` en Redirect URLs. El code debe procesarse en `/auth/callback`, no en `/`.
> Si acabas en `/?error=...`, revisa Site URL y Redirect URLs (con y sin `www`).

## 2. Supabase → Authentication → Providers → Google

1. Activar Google
2. Pegar **Client ID** y **Client Secret** de Google Cloud Console

## 3. Google Cloud Console → OAuth 2.0 Client

**Authorized redirect URIs** (obligatorio — apunta a Supabase, no a tu app):

```
https://<TU-PROJECT-REF>.supabase.co/auth/v1/callback
```

Ejemplo: `https://kcaiuodwgthpsxoqlccg.supabase.co/auth/v1/callback`

**Authorized JavaScript origins** (opcional para web):

```
https://observal.app
http://localhost:3000
```

## 4. Variables en Vercel / `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key de Supabase → Settings → API>
NEXT_PUBLIC_APP_URL=https://observal.app
```

La anon key está en **Project Settings → API → anon public**.

## 5. Migraciones (registro automático)

Al primer login, el trigger `handle_new_user` crea:

- Una **organización** (rol `owner`)
- Un **profile** vinculado al usuario

Si hay invitación pendiente (`org_invites`), el usuario se une a esa org con el rol indicado.

Aplicar migraciones:

```bash
supabase db push
```

## 6. Probar en local

```bash
cd apps/web
cp ../../.env.example .env.local   # editar con tus claves
npm run dev
```

Abrir `http://localhost:3000/login` → Google → deberías llegar a `/app`.

## Errores frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| Vuelve a `/login?error=auth` | Callback URL no en allowlist de Supabase |
| `/?error=server_error&error_description=Database+error+saving+new+user` | Trigger de registro falló — aplicar migración `20250724100000_fix_signup_triggers.sql` |
| Loop login → Google → login | Cookies de sesión no persistidas (fix en `/auth/callback`) |
| `redirect_uri_mismatch` en Google | URI de callback en Google Cloud no es `...supabase.co/auth/v1/callback` |
| Entra pero `/app` vacío / errores RLS | Migraciones no aplicadas o profile no creado |
| Invitación no funciona | Email de Google ≠ email de la invitación |

## Verificar sesión

Tras login, en DevTools → Application → Cookies deberías ver cookies `sb-<ref>-auth-token`.
