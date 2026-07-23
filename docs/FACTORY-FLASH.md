# Factory — imagen golden Raspberry Pi

## Flujo de fabricación

```text
1. preload-identity.py --register  →  Supabase + archivos locales
2. Flash Raspberry Pi OS Lite
3. install.sh en la Pi
4. Copiar identity.json → /etc/observal/
5. Pegar etiqueta con pairing code
6. QC: simulate-collector.py o Pi real online
7. Embalaje
```

## 1. Registrar dispositivo

```bash
cd factory
pip install -r requirements.txt
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=xxx

python preload-identity.py --register --batch-id BATCH-2026-001 --output-dir ./out/device-001
```

Genera:
- `identity.json` → identidad cifrada de fábrica
- `label.txt` → etiqueta imprimible
- `pairing-code.txt` → código para QA

## 2. Preparar SD (resumen)

1. [Raspberry Pi Imager](https://www.raspberrypi.com/software/) → **Pi OS Lite (64-bit)**
2. Usuario: `observal` / SSH habilitado (opcional para QA)
3. Boot, copiar repo o tarball del collector
4. `sudo bash collector/install.sh`
5. Editar `/etc/observal/observal.env` con `SUPABASE_URL`
6. `sudo cp identity.json /etc/observal/identity.json`
7. **Permisos** (el servicio corre como usuario `observal`):
   ```bash
   sudo chown root:observal /etc/observal /etc/observal/*
   sudo chmod 750 /etc/observal
   sudo chmod 640 /etc/observal/identity.json /etc/observal/observal.env
   ```
8. `sudo systemctl start observal-collector`

## 3. Batch (10+ unidades)

```bash
python register-device.py --count 10 --batch-id BATCH-2026-001
```

Para cada unidad, ejecutar `preload-identity.py` con el hardware_id del registro o automatizar loop.

## 4. QA antes de envío

```bash
# En Pi o simulador
export SUPABASE_URL=...
export OBSERVAL_DEV=1  # solo simulador
python factory/simulate-collector.py
```

En web: estado **online_unclaimed** → activar con pairing code → **active**.

## 5. Seguridad SD

- `identity.json` en `/etc/observal/` (permisos 600)
- Secretos SNMP en vault cifrado tras activación
- Si roban SD sin Pi: datos ilegibles (device_secret en board idealmente; MVP en identity partition)

## LED de estado (opcional)

| Estado | LED |
|--------|-----|
| Esperando activación | Amarillo parpadeo |
| Activo | Verde fijo |
| Sin internet | Rojo fijo |

Implementación GPIO: fase post-MVP.
