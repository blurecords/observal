"""NovaStar LED processor HTTP/TCP adapter."""

from __future__ import annotations

import asyncio
import socket
from datetime import datetime, timezone
from typing import Any

import httpx

from observal_collector.adapters.base import BaseAdapter, PollResult


class NovaStarHttpAdapter(BaseAdapter):
    profile = "novastar_http"

    async def poll(self, host: str, device: dict, credentials: dict) -> PollResult:
        http_port = int(
            credentials.get("novastar_port")
            or credentials.get("tcp_port")
            or device.get("metadata", {}).get("novastar_port")
            or 8001
        )
        tcp_port = int(
            credentials.get("novastar_tcp_port")
            or device.get("metadata", {}).get("novastar_tcp_port")
            or 5200
        )

        loop = asyncio.get_event_loop()
        try:
            data = await loop.run_in_executor(
                None, self._query, host, http_port, tcp_port
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

        if data.get("brightness") is not None:
            metrics.append(
                {
                    "name": "novastar.brightness",
                    "value": data["brightness"],
                    "status": status,
                    "ts": ts,
                }
            )

        if data.get("temperature") is not None:
            metrics.append(
                {
                    "name": "novastar.temperature",
                    "value": data["temperature"],
                    "status": status,
                    "ts": ts,
                }
            )

        if data.get("device_status"):
            metrics.append(
                {
                    "name": "novastar.status",
                    "value": data["device_status"],
                    "status": status,
                    "ts": ts,
                }
            )

        if data.get("mode"):
            metrics.append(
                {
                    "name": "novastar.connection_mode",
                    "value": data["mode"],
                    "status": status,
                    "ts": ts,
                }
            )

        return PollResult(status=status, latency_ms=data.get("latency_ms"), metrics=metrics)

    def _query(self, host: str, http_port: int, tcp_port: int) -> dict[str, Any]:
        start = datetime.now(timezone.utc)
        paths = ["/api/v1/device/info", "/api/v1/status", "/api/device/status"]

        for path in paths:
            try:
                resp = httpx.get(f"http://{host}:{http_port}{path}", timeout=3)
                if resp.status_code != 200:
                    continue
                parsed = self._parse_json(resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {})
                if parsed.get("reachable"):
                    parsed["mode"] = "http"
                    parsed["latency_ms"] = int(
                        (datetime.now(timezone.utc) - start).total_seconds() * 1000
                    )
                    return parsed
            except (httpx.RequestError, ValueError, TypeError):
                continue

        try:
            with socket.create_connection((host, tcp_port), timeout=3):
                latency = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)
                return {"reachable": True, "mode": "tcp", "latency_ms": latency}
        except OSError as exc:
            raise RuntimeError(f"NovaStar unreachable on HTTP:{http_port} and TCP:{tcp_port}") from exc

    def _parse_json(self, payload: Any) -> dict[str, Any]:
        if not isinstance(payload, dict):
            return {"reachable": False}

        data = payload.get("data", payload)
        if not isinstance(data, dict):
            data = payload

        result: dict[str, Any] = {"reachable": True}

        for key in ("brightness", "screenBrightness", "bright"):
            if key in data and isinstance(data[key], (int, float)):
                result["brightness"] = int(data[key])
                break

        for key in ("temperature", "temp", "boardTemperature"):
            if key in data and isinstance(data[key], (int, float)):
                result["temperature"] = float(data[key])
                break

        for key in ("status", "deviceStatus", "state"):
            if key in data:
                result["device_status"] = str(data[key])
                break

        if "name" in data:
            result["device_status"] = result.get("device_status") or str(data["name"])

        return result
