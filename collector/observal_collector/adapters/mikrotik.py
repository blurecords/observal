"""MikroTik RouterOS adapter — REST API (v7+) and extended SNMP."""

from __future__ import annotations

import asyncio
import re
import subprocess
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from observal_collector.adapters.base import BaseAdapter, PollResult

MIKROTIK_SNMP_OIDS: dict[str, str] = {
    "sysName": "1.3.6.1.2.1.1.5.0",
    "sysUpTime": "1.3.6.1.2.1.1.3.0",
    "sysDescr": "1.3.6.1.2.1.1.1.0",
    "mtxrCpuLoad": "1.3.6.1.4.1.14988.1.1.4.4.0",
    "mtxrCpuTemperature": "1.3.6.1.4.1.14988.1.1.3.10.0",
}

IF_HC_IN = "1.3.6.1.2.1.31.1.1.1.6"
IF_HC_OUT = "1.3.6.1.2.1.31.1.1.1.10"
IF_OPER = "1.3.6.1.2.1.2.2.1.8"
IF_DESCR = "1.3.6.1.2.1.2.2.1.2"


def _parse_routeros_uptime(value: str | int | float) -> int | None:
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip()
    if text.isdigit():
        return int(text)

    total = 0
    for amount, unit in re.findall(r"(\d+)([wdhms])", text):
        mult = {"w": 604800, "d": 86400, "h": 3600, "m": 60, "s": 1}.get(unit, 0)
        total += int(amount) * mult
    return total or None


class MikrotikApiAdapter(BaseAdapter):
    profile = "mikrotik_api"

    def __init__(self) -> None:
        self._prev_counters: dict[str, tuple[float, int, int]] = {}

    async def poll(self, host: str, device: dict, credentials: dict) -> PollResult:
        username = credentials.get("mikrotik_username") or credentials.get("username") or "admin"
        password = credentials.get("mikrotik_password") or credentials.get("password") or ""
        use_https = str(
            credentials.get("mikrotik_use_https")
            or device.get("metadata", {}).get("mikrotik_use_https")
            or "true"
        ).lower() not in ("0", "false", "no")
        port = int(
            credentials.get("mikrotik_api_port")
            or device.get("metadata", {}).get("mikrotik_api_port")
            or (443 if use_https else 80)
        )

        loop = asyncio.get_event_loop()
        try:
            data = await loop.run_in_executor(
                None,
                self._query_rest,
                host,
                port,
                username,
                password,
                use_https,
                device.get("id", host),
            )
        except Exception as exc:
            return PollResult(status="offline", error=str(exc))

        if not data.get("reachable"):
            return PollResult(status="offline", error=data.get("error", "RouterOS API unreachable"))

        ts = datetime.now(timezone.utc).isoformat()
        metrics: list[dict[str, Any]] = [
            {
                "name": "device.reachable",
                "value": True,
                "status": "online",
                "ts": ts,
            },
            {
                "name": "router.reachable",
                "value": True,
                "status": "online",
                "ts": ts,
            },
        ]

        system = data.get("system") or {}
        for key, metric_name, as_text in (
            ("cpu_load", "router.cpu_load", False),
            ("memory_used_pct", "router.memory_used_pct", False),
            ("memory_free_bytes", "router.memory_free_bytes", False),
            ("memory_total_bytes", "router.memory_total_bytes", False),
            ("uptime_sec", "router.uptime_sec", False),
            ("cpu_count", "router.cpu_count", False),
            ("temperature", "router.temperature", False),
            ("ip_addresses_count", "router.ip_addresses_count", False),
            ("routes_count", "router.routes_count", False),
            ("dhcp_leases_count", "router.dhcp_leases_count", False),
            ("version", "router.version", True),
            ("board_name", "router.board_name", True),
            ("identity", "router.identity", True),
        ):
            val = system.get(key)
            if val is None:
                continue
            metrics.append(
                {
                    "name": metric_name,
                    "value": val if as_text else val,
                    "status": "online",
                    "ts": ts,
                }
            )

        for iface in data.get("interfaces") or []:
            labels = {"interface": iface["name"]}
            metrics.append(
                {
                    "name": "router.interface.up",
                    "value": iface["up"],
                    "status": "online" if iface["up"] else "warning",
                    "ts": ts,
                    "labels": labels,
                }
            )
            if iface.get("type"):
                metrics.append(
                    {
                        "name": "router.interface.type",
                        "value": iface["type"],
                        "status": "online",
                        "ts": ts,
                        "labels": labels,
                    }
                )
            if iface.get("rx_bytes") is not None:
                metrics.append(
                    {
                        "name": "router.interface.rx_bytes",
                        "value": iface["rx_bytes"],
                        "status": "online",
                        "ts": ts,
                        "labels": labels,
                    }
                )
            if iface.get("tx_bytes") is not None:
                metrics.append(
                    {
                        "name": "router.interface.tx_bytes",
                        "value": iface["tx_bytes"],
                        "status": "online",
                        "ts": ts,
                        "labels": labels,
                    }
                )
            if iface.get("rx_bps") is not None:
                metrics.append(
                    {
                        "name": "router.interface.rx_bps",
                        "value": iface["rx_bps"],
                        "status": "online",
                        "ts": ts,
                        "labels": labels,
                    }
                )
            if iface.get("tx_bps") is not None:
                metrics.append(
                    {
                        "name": "router.interface.tx_bps",
                        "value": iface["tx_bps"],
                        "status": "online",
                        "ts": ts,
                        "labels": labels,
                    }
                )

        return PollResult(status="online", metrics=metrics)

    def _query_rest(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        use_https: bool,
        device_key: str,
    ) -> dict[str, Any]:
        scheme = "https" if use_https else "http"
        base = f"{scheme}://{host}:{port}/rest"
        auth = httpx.BasicAuth(username, password)

        with httpx.Client(verify=False, timeout=8.0, auth=auth) as client:
            resource = self._rest_get(client, f"{base}/system/resource")
            if resource is None:
                return {"reachable": False, "error": "No response from /system/resource"}

            identity_rows = self._rest_get(client, f"{base}/system/identity") or []
            interfaces = self._rest_get(client, f"{base}/interface") or []
            addresses = self._rest_get(client, f"{base}/ip/address") or []
            routes = self._rest_get(client, f"{base}/ip/route") or []
            leases = self._rest_get(client, f"{base}/ip/dhcp-server/lease") or []

        row = resource[0] if resource else {}
        total_mem = int(row.get("total-memory") or row.get("total_memory") or 0)
        free_mem = int(row.get("free-memory") or row.get("free_memory") or 0)
        used_pct = round((1 - free_mem / total_mem) * 100, 1) if total_mem else None

        identity = ""
        if identity_rows:
            identity = str(identity_rows[0].get("name") or "")

        parsed_interfaces: list[dict[str, Any]] = []
        now = time.time()
        for iface in interfaces:
            if str(iface.get("disabled", "false")).lower() == "true":
                continue
            name = str(iface.get("name") or iface.get(".id") or "unknown")
            running = str(iface.get("running", "false")).lower() == "true"
            rx_bytes = int(iface.get("rx-byte") or iface.get("rx_byte") or 0)
            tx_bytes = int(iface.get("tx-byte") or iface.get("tx_byte") or 0)
            counter_key = f"{device_key}:{name}"
            rx_bps = None
            tx_bps = None
            prev = self._prev_counters.get(counter_key)
            if prev:
                elapsed = max(now - prev[0], 0.001)
                rx_bps = max(int((rx_bytes - prev[1]) * 8 / elapsed), 0)
                tx_bps = max(int((tx_bytes - prev[2]) * 8 / elapsed), 0)
            self._prev_counters[counter_key] = (now, rx_bytes, tx_bytes)

            parsed_interfaces.append(
                {
                    "name": name,
                    "type": str(iface.get("type") or ""),
                    "up": running,
                    "rx_bytes": rx_bytes,
                    "tx_bytes": tx_bytes,
                    "rx_bps": rx_bps,
                    "tx_bps": tx_bps,
                }
            )

        return {
            "reachable": True,
            "system": {
                "cpu_load": float(row.get("cpu-load") or row.get("cpu_load") or 0),
                "memory_used_pct": used_pct,
                "memory_free_bytes": free_mem,
                "memory_total_bytes": total_mem,
                "uptime_sec": _parse_routeros_uptime(row.get("uptime") or row.get("uptime_sec") or 0),
                "cpu_count": int(row.get("cpu-count") or row.get("cpu_count") or 0) or None,
                "temperature": self._optional_float(row.get("cpu-temperature") or row.get("cpu_temperature")),
                "version": str(row.get("version") or ""),
                "board_name": str(row.get("board-name") or row.get("board_name") or ""),
                "identity": identity,
                "ip_addresses_count": len(addresses),
                "routes_count": len(routes),
                "dhcp_leases_count": len(leases),
            },
            "interfaces": parsed_interfaces,
        }

    def _rest_get(self, client: httpx.Client, url: str) -> list[dict[str, Any]] | None:
        try:
            resp = client.get(url)
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else [data]
        except httpx.HTTPError:
            return None

    def _optional_float(self, value: Any) -> float | None:
        try:
            if value is None or value == "":
                return None
            return float(value)
        except (TypeError, ValueError):
            return None


class MikrotikSnmpAdapter(BaseAdapter):
    profile = "mikrotik_snmp"

    def __init__(self) -> None:
        self._prev_counters: dict[str, tuple[float, int, int]] = {}

    async def poll(self, host: str, device: dict, credentials: dict) -> PollResult:
        community = credentials.get("snmp_community", "public")
        loop = asyncio.get_event_loop()
        try:
            data = await loop.run_in_executor(
                None, self._query_snmp, host, community, device.get("id", host)
            )
        except Exception as exc:
            return PollResult(status="offline", error=str(exc))

        if not data.get("reachable"):
            return PollResult(status="offline", error=data.get("error", "SNMP no response"))

        ts = datetime.now(timezone.utc).isoformat()
        metrics: list[dict[str, Any]] = [
            {"name": "device.reachable", "value": True, "status": "online", "ts": ts},
            {"name": "router.reachable", "value": True, "status": "online", "ts": ts},
        ]

        system = data.get("system") or {}
        for key, metric_name, as_text in (
            ("sys_name", "router.identity", True),
            ("sys_descr", "router.board_name", True),
            ("sys_up_time", "router.uptime_sec", False),
            ("cpu_load", "router.cpu_load", False),
            ("temperature", "router.temperature", False),
        ):
            val = system.get(key)
            if val is None:
                continue
            metrics.append(
                {"name": metric_name, "value": val, "status": "online", "ts": ts}
            )

        for iface in data.get("interfaces") or []:
            labels = {"interface": iface["name"]}
            metrics.append(
                {
                    "name": "router.interface.up",
                    "value": iface["up"],
                    "status": "online" if iface["up"] else "warning",
                    "ts": ts,
                    "labels": labels,
                }
            )
            if iface.get("rx_bytes") is not None:
                metrics.append(
                    {
                        "name": "router.interface.rx_bytes",
                        "value": iface["rx_bytes"],
                        "status": "online",
                        "ts": ts,
                        "labels": labels,
                    }
                )
            if iface.get("tx_bytes") is not None:
                metrics.append(
                    {
                        "name": "router.interface.tx_bytes",
                        "value": iface["tx_bytes"],
                        "status": "online",
                        "ts": ts,
                        "labels": labels,
                    }
                )
            if iface.get("rx_bps") is not None:
                metrics.append(
                    {
                        "name": "router.interface.rx_bps",
                        "value": iface["rx_bps"],
                        "status": "online",
                        "ts": ts,
                        "labels": labels,
                    }
                )
            if iface.get("tx_bps") is not None:
                metrics.append(
                    {
                        "name": "router.interface.tx_bps",
                        "value": iface["tx_bps"],
                        "status": "online",
                        "ts": ts,
                        "labels": labels,
                    }
                )

        return PollResult(status="online", metrics=metrics)

    def _query_snmp(self, host: str, community: str, device_key: str) -> dict[str, Any]:
        scalars = self._snmp_get_batch(host, community, MIKROTIK_SNMP_OIDS)
        if not scalars:
            return {"reachable": False, "error": "SNMP no response"}

        if_table = self._snmp_table(host, community, IF_DESCR)
        oper_table = self._snmp_table(host, community, IF_OPER)
        in_table = self._snmp_table(host, community, IF_HC_IN, numeric=True)
        out_table = self._snmp_table(host, community, IF_HC_OUT, numeric=True)

        now = time.time()
        interfaces: list[dict[str, Any]] = []
        for idx, name in if_table.items():
            if name.startswith("lo") or name == "null":
                continue
            oper = oper_table.get(idx, "2")
            up = oper == "1"
            rx_bytes = int(in_table.get(idx, 0))
            tx_bytes = int(out_table.get(idx, 0))
            counter_key = f"{device_key}:{name}"
            rx_bps = tx_bps = None
            prev = self._prev_counters.get(counter_key)
            if prev:
                elapsed = max(now - prev[0], 0.001)
                rx_bps = max(int((rx_bytes - prev[1]) * 8 / elapsed), 0)
                tx_bps = max(int((tx_bytes - prev[2]) * 8 / elapsed), 0)
            self._prev_counters[counter_key] = (now, rx_bytes, tx_bytes)
            interfaces.append(
                {
                    "name": name,
                    "up": up,
                    "rx_bytes": rx_bytes,
                    "tx_bytes": tx_bytes,
                    "rx_bps": rx_bps,
                    "tx_bps": tx_bps,
                }
            )

        cpu_raw = scalars.get("mtxrCpuLoad")
        temp_raw = scalars.get("mtxrCpuTemperature")
        return {
            "reachable": True,
            "system": {
                "sys_name": scalars.get("sysName"),
                "sys_descr": scalars.get("sysDescr"),
                "sys_up_time": scalars.get("sysUpTime"),
                "cpu_load": float(cpu_raw) if cpu_raw is not None else None,
                "temperature": float(temp_raw) if temp_raw is not None else None,
            },
            "interfaces": interfaces,
        }

    def _snmp_get_batch(
        self, host: str, community: str, oids: dict[str, str]
    ) -> dict[str, str | int | float]:
        results: dict[str, str | int | float] = {}
        for key, oid in oids.items():
            value = self._snmpget(host, community, oid)
            if value is None:
                continue
            if key == "sysUpTime" and str(value).isdigit():
                results["sysUpTime"] = int(value) // 100
            elif key in ("mtxrCpuLoad", "mtxrCpuTemperature"):
                try:
                    results[key] = float(value)
                except ValueError:
                    results[key] = value.strip('"')
            else:
                results[key] = value.strip('"')
        return results

    def _snmp_table(
        self, host: str, community: str, oid: str, numeric: bool = False
    ) -> dict[str, str]:
        rows: dict[str, str] = {}
        try:
            proc = subprocess.run(
                ["snmpwalk", "-v2c", "-c", community, "-Oqn", "-t", "2", host, oid],
                capture_output=True,
                text=True,
                timeout=12,
            )
        except (subprocess.SubprocessError, FileNotFoundError):
            return rows
        if proc.returncode != 0:
            return rows
        for line in proc.stdout.splitlines():
            parts = line.strip().split(" ", 1)
            if len(parts) != 2:
                continue
            oid_key, value = parts
            idx = oid_key.split(".")[-1]
            cleaned = value.strip().strip('"')
            if numeric:
                try:
                    cleaned = str(int(cleaned))
                except ValueError:
                    cleaned = "0"
            rows[idx] = cleaned
        return rows

    def _snmpget(self, host: str, community: str, oid: str) -> str | None:
        try:
            proc = subprocess.run(
                ["snmpget", "-v2c", "-c", community, "-Oqv", "-t", "2", host, oid],
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
