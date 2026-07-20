"""Extron SIS (Simple Instruction Set) adapter for matrices and control processors."""

from __future__ import annotations

import asyncio
import socket
from datetime import datetime, timezone
from typing import Any

from observal_collector.adapters.base import BaseAdapter, PollResult


class ExtronSisAdapter(BaseAdapter):
    profile = "extron_sis"

    async def poll(self, host: str, device: dict, credentials: dict) -> PollResult:
        port = int(
            credentials.get("sis_port")
            or credentials.get("tcp_port")
            or device.get("metadata", {}).get("sis_port")
            or 23
        )
        password = (
            credentials.get("sis_password")
            or credentials.get("password")
            or device.get("metadata", {}).get("sis_password")
            or ""
        )
        address = str(
            credentials.get("sis_address")
            or device.get("metadata", {}).get("sis_address")
            or "0"
        )

        loop = asyncio.get_event_loop()
        try:
            data = await loop.run_in_executor(
                None, self._query_sis, host, port, password, address
            )
        except Exception as exc:
            return PollResult(status="offline", error=str(exc))

        status = "online" if data.get("reachable") else "offline"
        ts = datetime.now(timezone.utc).isoformat()
        metrics: list[dict[str, Any]] = [
            {
                "name": "device.reachable",
                "value": data.get("reachable", False),
                "status": status,
                "ts": ts,
            }
        ]

        if data.get("device_info"):
            metrics.append(
                {
                    "name": "extron.device_info",
                    "value": data["device_info"],
                    "status": status,
                    "ts": ts,
                }
            )

        if data.get("power_state") is not None:
            metrics.append(
                {
                    "name": "extron.power_state",
                    "value": data["power_state"],
                    "status": status,
                    "ts": ts,
                }
            )

        if data.get("active_outputs") is not None:
            metrics.append(
                {
                    "name": "extron.active_outputs",
                    "value": data["active_outputs"],
                    "status": status,
                    "ts": ts,
                }
            )

        return PollResult(status=status, latency_ms=data.get("latency_ms"), metrics=metrics)

    def _query_sis(
        self, host: str, port: int, password: str, address: str
    ) -> dict[str, Any]:
        start = datetime.now(timezone.utc)
        result: dict[str, Any] = {"reachable": False}

        with socket.create_connection((host, port), timeout=3) as sock:
            sock.settimeout(3)

            if password:
                sock.sendall(f"{password}\r".encode("ascii"))
                self._read_response(sock)

            info_resp = self._send_command(sock, "I")
            if info_resp and not info_resp.startswith("E"):
                result["reachable"] = True
                cleaned = info_resp.lstrip("%").strip()
                if cleaned:
                    result["device_info"] = cleaned[:120]

            power_resp = self._send_command(sock, "33*")
            if power_resp and not power_resp.startswith("E"):
                result["reachable"] = True
                digits = "".join(c for c in power_resp if c.isdigit())
                if digits:
                    result["power_state"] = power_resp.strip()[:32]
                    result["active_outputs"] = sum(1 for c in digits if c == "1")

            addr_info = self._send_command(sock, f"{address}I")
            if addr_info and not addr_info.startswith("E"):
                result["reachable"] = True
                cleaned = addr_info.lstrip("%").strip()
                if cleaned and "device_info" not in result:
                    result["device_info"] = cleaned[:120]

        latency = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
        result["latency_ms"] = latency
        return result

    def _send_command(self, sock: socket.socket, command: str) -> str:
        sock.sendall(f"{command}\r".encode("ascii"))
        return self._read_response(sock)

    def _read_response(self, sock: socket.socket) -> str:
        chunks: list[str] = []
        while True:
            try:
                data = sock.recv(4096)
            except socket.timeout:
                break
            if not data:
                break
            chunks.append(data.decode("ascii", errors="ignore"))
            if "\r" in chunks[-1] or "\n" in chunks[-1]:
                break
        return "".join(chunks).strip()
