# Desarrollo sin Raspberry Pi

Puedes avanzar con casi todo el producto antes de tener hardware físico: plataforma web, inventario AV, alertas, gráficos y flujo de activación simulado.

## 1. Plataforma web local

```bash
cd apps/web
cp ../../.env.example .env.local
npm install
npm run dev
```

Abre `http://localhost:3000/app` e inicia sesión con Google.

## 2. Asistente de inicio

Ve a `/app/onboarding` para:

1. Nombrar tu organización
2. Crear la primera sede / instalación
3. Ver instrucciones del collector (Pi real o simulador)

## 3. Simular un collector (laptop)

El simulador usa identidad local en `collector/data/` y se conecta a tu Supabase igual que una Pi.

```bash
cd factory
pip install -r requirements.txt
pip install -e ../collector

export SUPABASE_URL=https://TU_PROYECTO.supabase.co
export OBSERVAL_DEV=1          # genera identidad si no existe
export OBSERVAL_DEMO=1         # métricas sintéticas (sin red AV real)
python simulate-collector.py
```

**Flujo completo de prueba:**

1. El simulador hace `announce` → aparece en Supabase como `online_unclaimed`
2. En `/app/collectors/activate` introduce el código de pairing (regístralo con `preload-identity.py --register` si aún no tienes uno)
3. Tras el `claim`, el simulador recibe token + lista de dispositivos en el `poll`
4. Cada 60 s envía métricas y heartbeats a `collector-ingest`

Para probar contra equipos reales en LAN, usa `OBSERVAL_DEMO=0`.

## 4. Registrar un dispositivo de fábrica (pairing code)

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
python preload-identity.py --register --output-dir ./out/dev-pi
# Anota pairing_code y hardware_id del output
```

## 5. Métricas demo para gráficos (sin collector)

Si solo quieres poblar gráficos en `/app/metrics` o en el detalle de un equipo:

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
python seed-demo-metrics.py --hours 48
```

## 6. Probar conexión de un equipo

En `/app/devices/[id]` pulsa **Probar ahora**. Marca `test_requested_at` en la base de datos; el collector (real o simulador) ejecuta la prueba en el siguiente ciclo y guarda `last_test_*`.

En modo demo la prueba siempre refleja el estado simulado (online/offline sintético).

Perfiles soportados en demo: `ping`, `pjlink_class1/2`, `snmp_*`, `tcp_health`, `extron_sis`.

## 7. Migraciones y Edge Functions pendientes

Aplica en Supabase Dashboard o CLI:

- `20250719300000_device_test.sql` — columnas de prueba de conexión
- Redespliega `collectors-poll` y `collector-ingest` si cambiaste el código

## 8. Cuando llegue la Pi

Sigue [FACTORY-FLASH.md](./FACTORY-FLASH.md) y [DEPLOY-PRODUCTION.md](./DEPLOY-PRODUCTION.md). El mismo flujo de activación; solo cambia el agente de `simulate-collector.py` a `systemd` en la Pi con `OBSERVAL_DEMO` desactivado.
