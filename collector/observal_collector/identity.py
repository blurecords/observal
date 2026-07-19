"""Device identity loading (factory + dev)."""

from __future__ import annotations

import json
import logging
import os
import sys
import uuid
from pathlib import Path

log = logging.getLogger("observal")


def load_device_identity(data_dir: str) -> tuple[str, bytes]:
    """
    Load hardware_id + device_secret from factory identity file.
    Search order:
      1. OBSERVAL_IDENTITY_PATH env
      2. /etc/observal/identity.json (production)
      3. {data_dir}/identity.json (dev)
      4. Auto-generate only if OBSERVAL_DEV=1
    """
    candidates = [
        os.environ.get("OBSERVAL_IDENTITY_PATH"),
        "/etc/observal/identity.json",
        str(Path(data_dir) / "identity.json"),
    ]

    for path_str in candidates:
        if not path_str:
            continue
        path = Path(path_str)
        if path.exists():
            data = json.loads(path.read_text())
            log.info("Identity loaded from %s", path)
            return data["hardware_id"], bytes.fromhex(data["device_secret"])

    if os.environ.get("OBSERVAL_DEV") == "1":
        log.warning("OBSERVAL_DEV=1 — generating ephemeral identity (not for production)")
        hardware_id = str(uuid.uuid4())
        device_secret = os.urandom(32)
        path = Path(data_dir) / "identity.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(
                {
                    "hardware_id": hardware_id,
                    "device_secret": device_secret.hex(),
                }
            )
        )
        return hardware_id, device_secret

    log.error(
        "No identity.json found. Flash device identity from factory before deployment."
    )
    sys.exit(1)
