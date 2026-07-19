# Observal AV

Remote monitoring platform for audiovisual equipment in museums and cultural venues.

**Domain:** [observal.app](https://observal.app)

## Architecture

```
observal.app (Next.js)  →  Supabase (DB + Auth + Edge Functions)
Raspberry Pi collector  →  SNMP / PJLink / TCP / … (multi-protocol adapters)
```

## Project structure

```
apps/web/           Next.js — landing + platform
packages/shared/    Shared TypeScript types
supabase/           Migrations + Edge Functions
collector/          Python agent for Raspberry Pi
factory/            Device registration scripts
```

## Quick start — Web

```bash
cd apps/web
cp ../../.env.example .env.local
# Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Supabase setup

1. Create project at [supabase.com](https://supabase.com)
2. Run migrations:
   ```bash
   npx supabase link --project-ref YOUR_REF
   npx supabase db push
   npx supabase functions deploy
   ```
3. Enable **Google** provider in Authentication → Providers
4. Set redirect URL: `https://observal.app/auth/callback`

### Edge Functions

| Function | Purpose |
|----------|---------|
| `collectors-announce` | Pi first contact |
| `collectors-poll` | Pi fetch config + token |
| `collectors-claim` | User activates Pi with pairing code |
| `collector-ingest` | Pi sends metrics |
| `check-collectors` | Cron: detect offline collectors (every 5 min) |

### Alert email (Resend)

1. Create account at [resend.com](https://resend.com)
2. Add secrets in Supabase: `RESEND_API_KEY`, `ALERTS_FROM_EMAIL`, `APP_URL`
3. Configure notification email in `/app/settings`

## Register a test Pi

```bash
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-key
python factory/register-device.py
```

Print the pairing code, then activate at `/app/collectors/activate`.

## Collector (Raspberry Pi)

```bash
cd collector
pip install -e .

export SUPABASE_URL=https://xxx.supabase.co
export OBSERVAL_DATA_DIR=./data
observal-collector
```

### Adapters (MVP)

| Profile | Protocol | Equipment |
|---------|----------|-----------|
| `ping` | ICMP | All |
| `pjlink_class1` | PJLink TCP 4352 | Projectors |
| `snmp_generic` | SNMP v2c (snmpget) | Matrices, DSP, generic AV |
| `snmp_qsc` | SNMP v2c extended | QSC amplifiers |
| `tcp_health` | TCP port | Processors, media players |

**Pi requirement for SNMP:** `sudo apt install snmp`

## Deploy to observal.app

**Recommended MVP:** Vercel + Hostinger DNS

1. Import repo in Vercel
2. Set env vars from `.env.example`
3. In Hostinger DNS:
   - `A` or `CNAME` for `@` and `app` → Vercel

## Development phases

- [x] **Sprint 1** — Monorepo, schema, landing, auth, activation, collector base
- [x] **Sprint 2** — Device wizard, venues/rooms, SNMP adapter, ECharts dashboard
- [x] **Sprint 3** — Alert rules, opening hours, email notifications, CSV import
- [ ] **Sprint 4** — Production hardening, factory flash, beta museum

## License

Proprietary — Observal
