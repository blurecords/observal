# Guía del cliente — Museo (5 minutos)

## Qué recibes

- Caja **Observal Collector** (Raspberry Pi)
- Cable de alimentación
- Cable Ethernet (recomendado)
- Etiqueta con código **XXXX-XXXX**

## Activación

1. Conecta la Pi al router/switch de la **red AV del museo** por Ethernet.
2. Enciende la Pi y espera **1 minuto**.
3. Entra en **[observal.app](https://observal.app)** con tu cuenta Google.
4. Ve a **Collectors → Activar collector**.
5. Introduce el código de la etiqueta.
6. Pon nombre al museo/venue.

¡Listo! No necesitas acceder a la Pi.

## Añadir equipos AV

1. **Salas y venues** → crea edificio y salas (galerías).
2. **Equipos AV → Añadir** → elige tipo (proyector, matriz, LED…).
3. Introduce IP y protocolo (PJLink, SNMP, etc.).
4. En ~60 segundos el collector empieza a monitorizar.

**Importación masiva:** Equipos AV → Importar CSV.

## Alertas

- Configura email en **Ajustes → Notificaciones**.
- Define horario de apertura en **Ajustes → Horario**.
- Revisa alertas en **Alertas** del panel.

## Si algo falla

| Problema | Solución |
|----------|----------|
| Pi no conecta | Comprobar Ethernet y que hay internet |
| Código inválido | Verificar etiqueta; contactar soporte |
| Equipo offline | Revisar IP, VLAN, SNMP activo en el equipo |
| Sin emails | Revisar email en Ajustes |

**Soporte:** observal.app
