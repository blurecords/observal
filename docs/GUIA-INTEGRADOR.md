# Guía integrador AV — Observal

## Requisitos de red

- Pi en la **misma VLAN/subred** que los equipos AV a monitorizar.
- Salida **HTTPS (443)** hacia internet (Supabase).
- No abrir puertos entrantes en el firewall del cliente.

## Preparación SNMP

| Equipo | Acción |
|--------|--------|
| Proyectores | Activar PJLink (puerto 4352) |
| Matrices / DSP | Activar SNMP v2c con comunidad dedicada |
| Switches AV | SNMP read-only |

Comunidad recomendada: una **custom** distinta de `public`.

## Perfiles Observal

| Perfil | Uso |
|--------|-----|
| `pjlink_class1` | Proyectores (Class 1) |
| `pjlink_class2` | Proyectores Class 2 (+ input, availability) |
| `extron_sis` | Matrices y procesadores Extron (SIS/TCP 23) |
| `novastar_http` | Procesadores LED NovaStar (HTTP + TCP 5200) |
| `snmp_generic` | Kramer, DSP, switches AV |
| `snmp_qsc` | Amplificadores QSC |
| `tcp_health` | Procesadores LED, media players |
| `ping` | Comprobación básica |

## Instalación on-site

1. Rack técnico: Pi con alimentación estable (UPS recomendado).
2. Ethernet al switch core AV.
3. Cliente activa con código en observal.app.
4. Integrador da de alta equipos o importa CSV.

## Inventario CSV

```csv
name,device_type,host,profile,brand,model,critical
"Proyector Sala 1",projector,192.168.10.10,pjlink_class1,Panasonic,PT-RZ990,yes
"Matriz Extron",video_matrix,192.168.10.20,extron_sis,Extron,DTP CrossPoint 84,no
```

## Checklist entrega

- [ ] Pi online en Collectors
- [ ] Todos los equipos críticos en verde
- [ ] Horario apertura configurado
- [ ] Email alertas probado
- [ ] Cliente tiene acceso Google a observal.app
