# Observal AV

Remote monitoring platform for audiovisual systems — museums, venues, corporate AV, and integrators.

**Domain:** [observal.app](https://observal.app)

## Architecture

```
observal.app (Next.js)  →  Supabase (DB + Auth + Edge Functions)
Raspberry Pi collector  →  PJLink / SNMP / TCP / ping (multi-protocol)
```

## Project structure

```
apps/web/           Next.js — landing + platform
packages/shared/    Shared TypeScript types
supabase/           Migrations + Edge Functions
collector/          Python agent for Raspberry Pi
factory/            Device registration + SD flash tooling
docs/               Client, integrator, deploy guides
```

## Quick start — Web

```bash
cd apps/web
cp ../../.env.example .env.local
npm install
npm run dev
```

## Collector (production Pi)

```bash
sudo bash collector/install.sh
# Edit /etc/observal/observal.env + copy identity.json from factory
sudo systemctl start observal-collector
```

## Factory — register device

```bash
cd factory && pip install -r requirements.txt
export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
python preload-identity.py --register --output-dir ./out/pi-001
```

See [docs/FACTORY-FLASH.md](docs/FACTORY-FLASH.md)

## Simulate without Pi

```bash
export SUPABASE_URL=...
export OBSERVAL_DEV=1
export OBSERVAL_DEMO=1   # synthetic metrics (default in simulate-collector.py)
python factory/simulate-collector.py
```

See [docs/DEV-SIN-PI.md](docs/DEV-SIN-PI.md) for the full dev workflow without hardware.

## Edge Functions

| Function | Purpose |
|----------|---------|
| `collectors-announce` | Pi first contact |
| `collectors-poll` | Pi fetch config + token |
| `collectors-claim` | User activates Pi |
| `collector-ingest` | Metrics + alert evaluation |
| `check-collectors` | Cron: offline collectors |
| `collectors-revoke` | Revoke stolen/lost Pi |
| `collectors-rotate-token` | Rotate ingest token |
| `purge-metrics` | Cron: delete old metrics by retention |
| `send-sla-reports` | Cron: monthly SLA email reports |

## Documentation

| Doc | Audience |
|-----|----------|
| [DEV-SIN-PI.md](docs/DEV-SIN-PI.md) | Developers (no Pi yet) |
| [GUIA-INTEGRADOR.md](docs/GUIA-INTEGRADOR.md) | AV integrators (Extron SIS, PJLink, SNMP) |
| [GUIA-CLIENTE-MUSEO.md](docs/GUIA-CLIENTE-MUSEO.md) | Museum staff |
| [BETA-PILOTO.md](docs/BETA-PILOTO.md) | Beta / primer cliente |
| [DEPLOY-PRODUCTION.md](docs/DEPLOY-PRODUCTION.md) | DevOps |
| [AUTH-SETUP.md](docs/AUTH-SETUP.md) | Google OAuth login |
| [FACTORY-FLASH.md](docs/FACTORY-FLASH.md) | Manufacturing |

## Development phases

- [x] Sprint 1 — Monorepo, schema, landing, auth, activation
- [x] Sprint 2 — Device wizard, venues, SNMP, dashboards
- [x] Sprint 3 — Alerts, opening hours, email, CSV import
- [x] Sprint 4 — Production hardening, factory flash, beta docs
- [x] Sprint 5 — Onboarding, demo mode, dev without Pi, device connection test
- [x] Sprint 6 — Extron SIS, device editing, PJLink Class 2, metrics/dashboard upgrades
- [x] Sprint 7 — NovaStar HTTP, credential encryption, metrics retention, AV alert rules
- [x] Sprint 8 — Team roles, invites, reports export, multi-collector UI, beta guide
- [x] Sprint 9 — Invite emails, audit log, SLA reports, landing pricing
- [x] Sprint 10 — SLA fix all profiles, webhooks, audit completeness, plan limits

## License

Proprietary — Observal
