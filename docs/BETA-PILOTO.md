# Guía beta piloto — Observal

Checklist para el primer cliente en producción (museo, venue corporativo o integrador).

## Antes del on-site

- [ ] Migraciones Sprint 1–10 aplicadas en Supabase
- [ ] Edge Functions desplegadas (incl. `purge-metrics`)
- [ ] `CREDENTIALS_ENCRYPTION_KEY` configurada (Vercel + Supabase)
- [ ] Cron `check-collectors` (5 min) y `purge-metrics` (diario 03:00)
- [ ] Dominio `observal.app` operativo con Google OAuth
- [ ] Pi registrada en factory (`preload-identity.py --register`)
- [ ] SD flasheada o simulador probado end-to-end

## Configuración organización (owner)

1. Completar **Onboarding** (`/app/onboarding`)
2. **Ajustes → Organización**: nombre, timezone
3. **Ajustes → Notificaciones**: email alertas, webhook Slack, retención métricas
4. **Ajustes → Horarios de apertura** por venue
5. **Ajustes → Equipo**: invitar integrador AV (rol integrator) y cliente (rol viewer)

## Roles recomendados

| Persona | Rol | Acceso |
|---------|-----|--------|
| Director / responsable AV | owner | Todo + equipo |
| Integrador / técnico | integrator | Equipos, collectors, alertas |
| Cliente / operador sala | viewer | Solo lectura |

## Instalación on-site

1. Pi en rack AV, Ethernet al switch core
2. Cliente activa collector en `/app/collectors/activate`
3. Integrador carga inventario (wizard o CSV)
4. Verificar Command Center en verde
5. Probar alerta email (desconectar un ping de prueba)

## Entrega al cliente

- [ ] Acceso Google concedido (viewer o integrator según perfil)
- [ ] Informe inicial: `/app/reports` → descargar CSV + PDF imprimible
- [ ] Documentación: [GUIA-CLIENTE-MUSEO.md](./GUIA-CLIENTE-MUSEO.md) adaptada al venue
- [ ] Contacto soporte Observal definido

## Post-beta (semana 1)

- [ ] Revisar alertas falsas y ajustar reglas
- [ ] Confirmar retención métricas adecuada (90 d default)
- [ ] Segunda Pi si el venue tiene VLANs separadas
