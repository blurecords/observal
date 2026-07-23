# MikroTik RouterOS 7 — REST API para Observal

## Por qué HTTP da 404

En RouterOS 7, **`/rest` por HTTP (puerto 80 / servicio `www`) solo existe desde v7.9**.

En versiones 7.0–7.8, el puerto 80 sirve WebFig y `/rest/...` devuelve **404 HTML** (tu caso).

**Solución:** usar **HTTPS** (`www-ssl`, puerto 443).

---

## Configuración en el MikroTik

Terminal o Winbox → New Terminal:

```
/system resource print

/ip service enable www-ssl
/ip service set www-ssl disabled=no port=443 address=192.168.0.0/16 tls-version=only-1.2

/user group add name=observal-read policy=local,read,api,rest-api,web,!write,!policy
/user add name=observal group=observal-read password=TuPasswordSegura
/user print
```

Ajusta `address=` a la red desde la que conecta la Pi.

---

## Prueba desde la Pi

```bash
# Debe devolver JSON (no HTML)
curl -k --tlsv1.2 -u 'observal:TuPasswordSegura' \
  https://192.168.1.1/rest/system/resource
```

Si el handshake TLS falla, en el MikroTik:

```
/ip service set www-ssl tls-version=only-1.2
```

---

## Configuración en Observal

| Campo | Valor |
|-------|--------|
| Protocolo | MikroTik RouterOS API (REST) |
| HTTPS | ✅ activado |
| Puerto | 443 |
| Usuario | observal |
| Contraseña | (la del router) |

Guardar → esperar ~60 s → panel en vivo.

---

## Actualizar collector en la Pi

```bash
sudo cp ~/observal/collector/observal_collector/adapters/mikrotik.py \
        /opt/observal/collector/observal_collector/adapters/
sudo systemctl restart observal-collector
```
