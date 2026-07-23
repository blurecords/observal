"""Observal AV collector main loop."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from observal_collector import __version__
from observal_collector.adapters import poll_device
from observal_collector.cloud_client import CloudClient, get_local_ip
from observal_collector.identity import load_device_identity
from observal_collector.vault import Vault

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("observal")


class CollectorAgent:
    def __init__(self) -> None:
        self.data_dir = Path(os.environ.get("OBSERVAL_DATA_DIR", "/var/lib/observal"))
        self.supabase_url = os.environ["SUPABASE_URL"]
        supabase_anon_key = os.environ.get("SUPABASE_ANON_KEY", "").strip()
        if not supabase_anon_key:
            raise RuntimeError("SUPABASE_ANON_KEY is required in observal.env")
        hardware_id, device_secret = load_device_identity(str(self.data_dir))
        self.hardware_id = hardware_id
        self.vault = Vault(self.data_dir, device_secret)
        self.cloud = CloudClient(self.supabase_url, hardware_id, supabase_anon_key)
        self.secrets = self.vault.load_secrets()
        self.collector_id: str | None = self.secrets.get("collector_id")
        self.ingest_token: str | None = self.secrets.get("ingest_token")
        self.config: dict = self.secrets.get("config", {})
        self.poll_interval = 60
        self._last_poll_at = 0.0

    async def run(self) -> None:
        mode = "demo" if os.environ.get("OBSERVAL_DEMO", "").strip() in ("1", "true", "yes") else "live"
        log.info(
            "Observal collector v%s — hardware_id=%s — mode=%s",
            __version__,
            self.hardware_id,
            mode,
        )

        await self.cloud.announce(__version__, get_local_ip())

        while True:
            try:
                await self._cycle()
            except Exception:
                log.exception("Cycle error")
            await asyncio.sleep(10)

    async def _cycle(self) -> None:
        poll_data = await self.cloud.poll()
        status = poll_data.get("status")

        if status == "online_unclaimed":
            log.info("Waiting for activation…")
            return

        if status == "revoked":
            log.warning("Collector revoked — stopping operations")
            self.secrets = {}
            self.ingest_token = None
            self.collector_id = None
            return

        if poll_data.get("ingest_token"):
            self.ingest_token = poll_data["ingest_token"]
            self.collector_id = poll_data.get("collector_id")
            self.secrets["ingest_token"] = self.ingest_token
            self.secrets["collector_id"] = self.collector_id
            self.vault.save_secrets(self.secrets)
            log.info("Ingest token received/rotated")

        if poll_data.get("config"):
            self.config = poll_data["config"]
            self.secrets["config"] = self.config
            self.vault.save_secrets(self.secrets)
            self.poll_interval = max(15, int(self.config.get("poll_interval_sec", 60)))

        if not self.collector_id or not self.ingest_token:
            return

        await self._flush_buffer()

        now = time.monotonic()
        if now - self._last_poll_at < self.poll_interval:
            return
        self._last_poll_at = now

        devices = self.config.get("devices", [])
        if not devices:
            log.debug("No devices configured")
            return

        metrics: list[dict] = []
        heartbeats: list[dict] = []
        device_tests: list[dict] = []

        for device in devices:
            try:
                result = await poll_device(device)
            except Exception as exc:
                log.warning("Poll failed for %s: %s", device.get("name"), exc)
                heartbeats.append(
                    {
                        "device_id": device["id"],
                        "status": "offline",
                    }
                )
                if device.get("test_requested_at"):
                    device_tests.append(
                        {
                            "device_id": device["id"],
                            "ok": False,
                            "message": str(exc),
                        }
                    )
                continue

            heartbeats.append(
                {
                    "device_id": device["id"],
                    "status": result.status,
                    "latency_ms": result.latency_ms,
                }
            )
            for m in result.metrics:
                metrics.append({**m, "device_id": device["id"]})

            if result.metrics:
                log.info(
                    "Polled %s (%s): %s — %d metrics",
                    device.get("name"),
                    device.get("profile"),
                    result.status,
                    len(result.metrics),
                )
            else:
                log.warning(
                    "Polled %s (%s): %s — 0 metrics%s",
                    device.get("name"),
                    device.get("profile"),
                    result.status,
                    f" — {result.error}" if result.error else "",
                )

            if device.get("test_requested_at"):
                ok = result.status == "online" and not result.error
                msg = (
                    f"Conexión OK ({result.latency_ms} ms)"
                    if ok and result.latency_ms
                    else ("Conexión OK" if ok else (result.error or "Sin respuesta"))
                )
                device_tests.append(
                    {
                        "device_id": device["id"],
                        "ok": ok,
                        "message": msg,
                    }
                )

        payload = {"metrics": metrics, "heartbeats": heartbeats, "device_tests": device_tests}

        try:
            await self.cloud.ingest(self.collector_id, self.ingest_token, payload)
            log.info("Ingested %d metrics from %d devices", len(metrics), len(devices))
        except Exception as exc:
            log.warning("Ingest failed, buffering: %s", exc)
            batch_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
            self.vault.save_buffer_batch(batch_id, payload)

    async def _flush_buffer(self) -> None:
        if not self.collector_id or not self.ingest_token:
            return

        for batch_path in self.vault.list_buffer_batches():
            try:
                payload = self.vault.load_buffer_batch(batch_path)
                await self.cloud.ingest(self.collector_id, self.ingest_token, payload)
                self.vault.delete_buffer_batch(batch_path)
                log.info("Flushed buffered batch %s", batch_path.name)
            except Exception as exc:
                log.warning("Buffer flush failed for %s: %s", batch_path.name, exc)
                break


def main() -> None:
    if not os.environ.get("SUPABASE_URL"):
        log.error("SUPABASE_URL not set")
        raise SystemExit(1)
    agent = CollectorAgent()
    asyncio.run(agent.run())


if __name__ == "__main__":
    main()
