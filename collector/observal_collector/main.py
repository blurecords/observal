"""Observal AV collector main loop."""

from __future__ import annotations

import asyncio
import logging
import os
import socket
from datetime import datetime, timezone
from pathlib import Path

from observal_collector import __version__
from observal_collector.adapters import poll_device
from observal_collector.cloud_client import CloudClient, get_local_ip, load_device_identity
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
        hardware_id, device_secret = load_device_identity(str(self.data_dir))
        self.hardware_id = hardware_id
        self.vault = Vault(self.data_dir, device_secret)
        self.cloud = CloudClient(self.supabase_url, hardware_id)
        self.secrets = self.vault.load_secrets()
        self.collector_id: str | None = self.secrets.get("collector_id")
        self.ingest_token: str | None = self.secrets.get("ingest_token")
        self.config: dict = self.secrets.get("config", {})
        self.poll_interval = 60
        self.send_interval = 60

    async def run(self) -> None:
        log.info("Observal collector v%s — hardware_id=%s", __version__, self.hardware_id)

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
            log.warning("Collector revoked")
            return

        if poll_data.get("ingest_token"):
            self.ingest_token = poll_data["ingest_token"]
            self.collector_id = poll_data.get("collector_id")
            self.secrets["ingest_token"] = self.ingest_token
            self.secrets["collector_id"] = self.collector_id
            self.vault.save_secrets(self.secrets)
            log.info("Ingest token received")

        if poll_data.get("config"):
            self.config = poll_data["config"]
            self.secrets["config"] = self.config
            self.vault.save_secrets(self.secrets)
            self.poll_interval = self.config.get("poll_interval_sec", 60)

        if not self.collector_id or not self.ingest_token:
            return

        devices = self.config.get("devices", [])
        if not devices:
            log.debug("No devices configured")
            return

        metrics: list[dict] = []
        heartbeats: list[dict] = []

        for device in devices:
            result = await poll_device(device)
            heartbeats.append(
                {
                    "device_id": device["id"],
                    "status": result.status,
                    "latency_ms": result.latency_ms,
                }
            )
            for m in result.metrics:
                metrics.append({**m, "device_id": device["id"]})

        payload = {"metrics": metrics, "heartbeats": heartbeats}

        try:
            await self.cloud.ingest(self.collector_id, self.ingest_token, payload)
            log.info("Ingested %d metrics from %d devices", len(metrics), len(devices))
        except Exception as exc:
            log.warning("Ingest failed, buffering: %s", exc)
            batch_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
            self.vault.save_buffer_batch(batch_id, payload)


def main() -> None:
    agent = CollectorAgent()
    asyncio.run(agent.run())


if __name__ == "__main__":
    main()
