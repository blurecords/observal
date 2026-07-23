"""Multi-protocol AV monitoring adapters."""

from __future__ import annotations

import asyncio
import socket
import subprocess
from datetime import datetime, timezone
from typing import Any

from observal_collector.adapters.base import BaseAdapter, PollResult
class PingAdapter(BaseAdapter):
    profile = "ping"

    async def poll(self, host: str, device: dict, credentials: dict) -> PollResult:
        loop = asyncio.get_event_loop()
        start = datetime.now(timezone.utc)
        ok = await loop.run_in_executor(None, self._ping, host)
        latency = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
        status = "online" if ok else "offline"
        return PollResult(
            status=status,
            latency_ms=latency if ok else None,
            metrics=[
                {
                    "name": "device.reachable",
                    "value": ok,
                    "status": status,
                    "ts": datetime.now(timezone.utc).isoformat(),
                }
            ],
        )

    def _ping(self, host: str) -> bool:
        try:
            result = subprocess.run(
                ["ping", "-c", "1", "-W", "2", host],
                capture_output=True,
                timeout=5,
            )
            return result.returncode == 0
        except (subprocess.SubprocessError, FileNotFoundError):
            return False


class TcpHealthAdapter(BaseAdapter):
    profile = "tcp_health"

    async def poll(self, host: str, device: dict, credentials: dict) -> PollResult:
        port = int(
            credentials.get("tcp_port")
            or credentials.get("port")
            or device.get("metadata", {}).get("tcp_port")
            or device.get("metadata", {}).get("port")
            or 80
        )
        loop = asyncio.get_event_loop()
        ok = await loop.run_in_executor(None, self._check_port, host, port)
        status = "online" if ok else "offline"
        return PollResult(
            status=status,
            metrics=[
                {
                    "name": "tcp.port_open",
                    "value": ok,
                    "status": status,
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "labels": {"port": str(port)},
                },
                {
                    "name": "device.reachable",
                    "value": ok,
                    "status": status,
                    "ts": datetime.now(timezone.utc).isoformat(),
                },
            ],
        )

    def _check_port(self, host: str, port: int) -> bool:
        try:
            with socket.create_connection((host, port), timeout=2):
                return True
        except OSError:
            return False


class PjlinkAdapter(BaseAdapter):
    """PJLink Class 1 subset for projectors."""

    profile = "pjlink_class1"

    async def poll(self, host: str, device: dict, credentials: dict) -> PollResult:
        password = credentials.get("pjlink_password") or credentials.get("password", "")
        class2 = device.get("profile") == "pjlink_class2"
        loop = asyncio.get_event_loop()
        try:
            data = await loop.run_in_executor(
                None, self._query_pjlink, host, password, class2
            )
        except Exception as exc:
            return PollResult(status="offline", error=str(exc))

        status = "online" if data.get("power") != "offline" else "offline"
        ts = datetime.now(timezone.utc).isoformat()
        metrics = [
            {
                "name": "device.reachable",
                "value": status == "online",
                "status": status,
                "ts": ts,
            },
            {
                "name": "projector.power",
                "value": data.get("power", "unknown"),
                "status": status,
                "ts": ts,
            }
        ]
        if "lamp_hours" in data:
            metrics.append(
                {
                    "name": "projector.lamp_hours",
                    "value": data["lamp_hours"],
                    "status": status,
                    "ts": ts,
                }
            )
        if "input" in data:
            metrics.append(
                {
                    "name": "projector.input",
                    "value": data["input"],
                    "status": status,
                    "ts": ts,
                }
            )
        if "availability" in data:
            metrics.append(
                {
                    "name": "projector.availability",
                    "value": data["availability"],
                    "status": status,
                    "ts": ts,
                }
            )
        return PollResult(status=status, metrics=metrics)

    def _query_pjlink(self, host: str, password: str, class2: bool = False) -> dict:
        with socket.create_connection((host, 4352), timeout=3) as sock:
            sock.settimeout(3)
            greeting = sock.recv(1024).decode("ascii", errors="ignore")
            if "PJLink" not in greeting:
                raise RuntimeError("Not a PJLink device")

            auth_needed = "PJLink 1" in greeting and "0" not in greeting.split()[1][0:1]
            if auth_needed and password:
                import hashlib

                seed = greeting.split()[2] if len(greeting.split()) > 2 else ""
                digest = hashlib.md5(f"{password}{seed}".encode()).hexdigest()
                sock.sendall(f"PJLINK 1 {digest}\r".encode())
            else:
                sock.sendall(b"PJLINK 0\r")

            sock.sendall(b"%1POWR ?\r")
            power_resp = sock.recv(256).decode("ascii", errors="ignore")
            power_map = {"0": "off", "1": "on", "2": "cooling", "3": "warming"}
            power_code = power_resp.split("=")[-1].strip()[:1] if "=" in power_resp else "?"
            result: dict[str, Any] = {"power": power_map.get(power_code, "unknown")}

            try:
                sock.sendall(b"%1LAMP ?\r")
                lamp_resp = sock.recv(256).decode("ascii", errors="ignore")
                if "=" in lamp_resp:
                    hours = lamp_resp.split("=")[1].split()[0]
                    result["lamp_hours"] = int(hours)
            except (ValueError, IndexError, OSError):
                pass

            if class2:
                try:
                    sock.sendall(b"%1INPT ?\r")
                    inpt_resp = sock.recv(256).decode("ascii", errors="ignore")
                    if "=" in inpt_resp:
                        raw = inpt_resp.split("=")[1].strip().split()[0]
                        result["input"] = raw
                except OSError:
                    pass

                try:
                    sock.sendall(b"%1AVMT ?\r")
                    avmt_resp = sock.recv(256).decode("ascii", errors="ignore")
                    if "=" in avmt_resp:
                        code = avmt_resp.split("=")[1].strip()[:1]
                        avail_map = {"0": "available", "1": "warning", "2": "error"}
                        result["availability"] = avail_map.get(code, "unknown")
                except OSError:
                    pass

            return result


from observal_collector.adapters.snmp import SnmpAdapter, SnmpQscAdapter
from observal_collector.adapters.extron_sis import ExtronSisAdapter
from observal_collector.adapters.novastar import NovaStarHttpAdapter
from observal_collector.adapters.mikrotik import MikrotikApiAdapter, MikrotikSnmpAdapter
from observal_collector.adapters.demo import DemoAdapter, demo_enabled

ADAPTERS: dict[str, BaseAdapter] = {
    "ping": PingAdapter(),
    "tcp_health": TcpHealthAdapter(),
    "pjlink_class1": PjlinkAdapter(),
    "pjlink_class2": PjlinkAdapter(),
    "snmp_generic": SnmpAdapter(),
    "snmp_qsc": SnmpQscAdapter(),
    "extron_sis": ExtronSisAdapter(),
    "novastar_http": NovaStarHttpAdapter(),
    "mikrotik_api": MikrotikApiAdapter(),
    "mikrotik_snmp": MikrotikSnmpAdapter(),
}


def _device_credentials(device: dict, credentials: dict | None) -> dict:
    merged = dict(device.get("metadata") or {})
    merged.update(device.get("credentials") or {})
    if credentials:
        merged.update(credentials)
    return merged


async def poll_device(device: dict, credentials: dict | None = None) -> PollResult:
    if demo_enabled():
        creds = _device_credentials(device, credentials)
        host = str(device["host"]).split("/")[0]
        return await DemoAdapter().poll(host, device, creds)

    profile = device.get("profile", "ping")
    adapter = ADAPTERS.get(profile, ADAPTERS["ping"])
    creds = _device_credentials(device, credentials or device.get("credentials"))
    host = str(device["host"]).split("/")[0]
    return await adapter.poll(host, device, creds)
