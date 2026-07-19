"""HTTP client for Supabase Edge Functions."""

from __future__ import annotations

import os
from typing import Any

import httpx


class CloudClient:
    def __init__(self, supabase_url: str, hardware_id: str) -> None:
        self.base = supabase_url.rstrip("/")
        self.hardware_id = hardware_id
        self.headers = {
            "Content-Type": "application/json",
            "x-collector-hardware-id": hardware_id,
        }

    async def announce(self, firmware_version: str, local_ip: str | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base}/functions/v1/collectors-announce",
                json={
                    "hardware_id": self.hardware_id,
                    "firmware_version": firmware_version,
                    "local_ip": local_ip,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def poll(self) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.base}/functions/v1/collectors-poll",
                headers=self.headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def ingest(
        self,
        collector_id: str,
        ingest_token: str,
        payload: dict[str, Any],
    ) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base}/functions/v1/collector-ingest",
                json={"collector_id": collector_id, **payload},
                headers={
                    **self.headers,
                    "Authorization": f"Bearer {ingest_token}",
                },
            )
            resp.raise_for_status()
            return resp.json()


def get_local_ip() -> str | None:
    import socket

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return None


def load_device_identity(data_dir: str) -> tuple[str, bytes]:
    """Load or create hardware_id and device_secret."""
    from pathlib import Path
    import uuid

    identity_path = Path(data_dir) / "identity.json"
    if identity_path.exists():
        import json

        data = json.loads(identity_path.read_text())
        return data["hardware_id"], bytes.fromhex(data["device_secret"])

    hardware_id = str(uuid.uuid4())
    device_secret = os.urandom(32)
    import json

    identity_path.parent.mkdir(parents=True, exist_ok=True)
    identity_path.write_text(
        json.dumps(
            {
                "hardware_id": hardware_id,
                "device_secret": device_secret.hex(),
            }
        )
    )
    return hardware_id, device_secret
