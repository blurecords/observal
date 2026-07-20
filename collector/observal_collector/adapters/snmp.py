"""SNMP v2c adapter for AV equipment (matrices, amplifiers, DSPs)."""

from __future__ import annotations

import asyncio
import subprocess
from datetime import datetime, timezone
from typing import Any

from observal_collector.adapters.base import BaseAdapter, PollResult

# Standard MIB-II + HOST-RESOURCES (subset)
OIDS: dict[str, str] = {
    "sysName": "1.3.6.1.2.1.1.5.0",
    "sysUpTime": "1.3.6.1.2.1.1.3.0",
    "sysDescr": "1.3.6.1.2.1.1.1.0",
}

QSC_EXTRA: dict[str, str] = {
    "hrSystemUptime": "1.3.6.1.2.1.25.1.1.0",
}


class SnmpAdapter(BaseAdapter):
    profile = "snmp_generic"

    async def poll(self, host: str, device: dict, credentials: dict) -> PollResult:
        community = credentials.get("snmp_community", "public")
        oids = OIDS if device.get("profile") != "snmp_qsc" else {**OIDS, **QSC_EXTRA}
        loop = asyncio.get_event_loop()

        try:
            results = await loop.run_in_executor(
                None, self._snmp_get_batch, host, community, oids
            )
        except Exception as exc:
            return PollResult(status="offline", error=str(exc))

        if not results:
            return PollResult(status="offline", error="SNMP no response")

        ts = datetime.now(timezone.utc).isoformat()
        metrics: list[dict[str, Any]] = []

        if "sysUpTime" in results:
            metrics.append(
                {
                    "name": "snmp.sys_up_time",
                    "value": results["sysUpTime"],
                    "status": "online",
                    "ts": ts,
                }
            )

        if "sysName" in results:
            metrics.append(
                {
                    "name": "snmp.sys_name",
                    "value": results["sysName"],
                    "status": "online",
                    "ts": ts,
                }
            )

        metrics.append(
            {
                "name": "snmp.reachable",
                "value": True,
                "status": "online",
                "ts": ts,
            }
        )
        metrics.append(
            {
                "name": "device.reachable",
                "value": True,
                "status": "online",
                "ts": ts,
            }
        )

        return PollResult(status="online", metrics=metrics)

    def _snmp_get_batch(
        self, host: str, community: str, oids: dict[str, str]
    ) -> dict[str, str | int]:
        results: dict[str, str | int] = {}
        for key, oid in oids.items():
            value = self._snmpget(host, community, oid)
            if value is not None:
                if key == "sysUpTime" and value.isdigit():
                    results[key] = int(value) // 100
                else:
                    results[key] = value.strip('"')
        return results

    def _snmpget(self, host: str, community: str, oid: str) -> str | None:
        try:
            proc = subprocess.run(
                [
                    "snmpget",
                    "-v2c",
                    "-c",
                    community,
                    "-Oqv",
                    "-t",
                    "2",
                    host,
                    oid,
                ],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if proc.returncode != 0:
                return None
            return proc.stdout.strip()
        except (subprocess.SubprocessError, FileNotFoundError):
            raise RuntimeError(
                "snmpget not found — install net-snmp on the Pi: sudo apt install snmp"
            )


class SnmpQscAdapter(SnmpAdapter):
    profile = "snmp_qsc"
