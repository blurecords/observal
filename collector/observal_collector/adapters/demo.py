"""Synthetic metrics for development without real AV hardware."""

from __future__ import annotations

import hashlib
import os
import random
from datetime import datetime, timezone

from observal_collector.adapters.base import BaseAdapter, PollResult


def demo_enabled() -> bool:
    return os.environ.get("OBSERVAL_DEMO", "").strip() in ("1", "true", "yes")


class DemoAdapter(BaseAdapter):
    """Generates plausible AV telemetry without network access."""

    profile = "demo"

    async def poll(self, host: str, device: dict, credentials: dict) -> PollResult:
        seed = int(hashlib.md5(f"{device.get('id', host)}".encode()).hexdigest()[:8], 16)
        rng = random.Random(seed + int(datetime.now(timezone.utc).timestamp() // 300))

        profile = device.get("profile", "ping")
        online = rng.random() > 0.08
        status = "online" if online else "offline"
        latency = rng.randint(1, 45) if online else None
        metrics: list[dict] = [
            {
                "name": "device.reachable",
                "value": online,
                "status": status,
                "ts": datetime.now(timezone.utc).isoformat(),
            }
        ]

        if online and profile in ("pjlink_class1", "pjlink_class2"):
            power = rng.choice(["on", "on", "on", "off", "cooling"])
            lamp_hours = rng.randint(120, 4200)
            metrics.extend(
                [
                    {
                        "name": "projector.power",
                        "value": power,
                        "status": status,
                        "ts": datetime.now(timezone.utc).isoformat(),
                    },
                    {
                        "name": "projector.lamp_hours",
                        "value": lamp_hours,
                        "status": status,
                        "ts": datetime.now(timezone.utc).isoformat(),
                    },
                ]
            )
            if profile == "pjlink_class2":
                metrics.extend(
                    [
                        {
                            "name": "projector.input",
                            "value": rng.choice(["HDMI1", "HDMI2", "DVI", "SDI"]),
                            "status": status,
                            "ts": datetime.now(timezone.utc).isoformat(),
                        },
                        {
                            "name": "projector.availability",
                            "value": rng.choice(["available", "available", "warning"]),
                            "status": status,
                            "ts": datetime.now(timezone.utc).isoformat(),
                        },
                    ]
                )

        if online and profile == "extron_sis":
            metrics.extend(
                [
                    {
                        "name": "extron.device_info",
                        "value": "DTP CrossPoint 84 HD 4K",
                        "status": status,
                        "ts": datetime.now(timezone.utc).isoformat(),
                    },
                    {
                        "name": "extron.active_outputs",
                        "value": rng.randint(2, 8),
                        "status": status,
                        "ts": datetime.now(timezone.utc).isoformat(),
                    },
                ]
            )

        if online and profile == "novastar_http":
            metrics.extend(
                [
                    {
                        "name": "novastar.brightness",
                        "value": rng.randint(40, 100),
                        "status": status,
                        "ts": datetime.now(timezone.utc).isoformat(),
                    },
                    {
                        "name": "novastar.temperature",
                        "value": round(rng.uniform(35, 55), 1),
                        "status": status,
                        "ts": datetime.now(timezone.utc).isoformat(),
                    },
                    {
                        "name": "novastar.status",
                        "value": "running",
                        "status": status,
                        "ts": datetime.now(timezone.utc).isoformat(),
                    },
                ]
            )

        if online and profile.startswith("snmp"):
            metrics.append(
                {
                    "name": "snmp.sysUpTime",
                    "value": rng.randint(86400, 8640000),
                    "status": status,
                    "ts": datetime.now(timezone.utc).isoformat(),
                }
            )

        if online and profile in ("mikrotik_api", "mikrotik_snmp"):
            ts = datetime.now(timezone.utc).isoformat()
            cpu = rng.randint(3, 45)
            mem_pct = round(rng.uniform(28, 72), 1)
            metrics.extend(
                [
                    {"name": "router.cpu_load", "value": cpu, "status": status, "ts": ts},
                    {"name": "router.memory_used_pct", "value": mem_pct, "status": status, "ts": ts},
                    {"name": "router.memory_free_bytes", "value": rng.randint(80_000_000, 180_000_000), "status": status, "ts": ts},
                    {"name": "router.memory_total_bytes", "value": 256_000_000, "status": status, "ts": ts},
                    {"name": "router.uptime_sec", "value": rng.randint(86400, 8640000), "status": status, "ts": ts},
                    {"name": "router.version", "value": "7.16.2", "status": status, "ts": ts},
                    {"name": "router.board_name", "value": "RB750Gr3", "status": status, "ts": ts},
                    {"name": "router.identity", "value": "Observal-Demo-Router", "status": status, "ts": ts},
                    {"name": "router.ip_addresses_count", "value": rng.randint(4, 12), "status": status, "ts": ts},
                    {"name": "router.routes_count", "value": rng.randint(8, 40), "status": status, "ts": ts},
                    {"name": "router.dhcp_leases_count", "value": rng.randint(2, 24), "status": status, "ts": ts},
                ]
            )
            for iface in ("ether1", "ether2", "wlan1", "bridge"):
                labels = {"interface": iface}
                up = rng.random() > 0.15
                metrics.extend(
                    [
                        {"name": "router.interface.up", "value": up, "status": status, "ts": ts, "labels": labels},
                        {"name": "router.interface.type", "value": "ether" if iface.startswith("ether") else "wlan", "status": status, "ts": ts, "labels": labels},
                        {"name": "router.interface.rx_bps", "value": rng.randint(100_000, 80_000_000), "status": status, "ts": ts, "labels": labels},
                        {"name": "router.interface.tx_bps", "value": rng.randint(100_000, 40_000_000), "status": status, "ts": ts, "labels": labels},
                        {"name": "router.interface.rx_bytes", "value": rng.randint(1_000_000, 900_000_000), "status": status, "ts": ts, "labels": labels},
                        {"name": "router.interface.tx_bytes", "value": rng.randint(1_000_000, 500_000_000), "status": status, "ts": ts, "labels": labels},
                    ]
                )

        if online and profile == "tcp_health":
            port = (
                credentials.get("tcp_port")
                or credentials.get("port")
                or device.get("metadata", {}).get("tcp_port")
                or 80
            )
            metrics.append(
                {
                    "name": "tcp.port_open",
                    "value": True,
                    "status": status,
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "labels": {"port": str(port)},
                }
            )

        return PollResult(status=status, latency_ms=latency, metrics=metrics)
