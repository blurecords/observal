#!/usr/bin/env python3
"""Generate identity.json for factory flash + optional label output."""

from __future__ import annotations

import argparse
import json
import os
import secrets
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from factory_lib import generate_pairing_code, register_in_supabase  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Preload Observal Pi identity for SD flash")
    parser.add_argument("--output-dir", default="./factory-output", help="Output directory")
    parser.add_argument("--batch-id", default=None, help="Factory batch identifier")
    parser.add_argument("--register", action="store_true", help="Also register in Supabase")
    parser.add_argument("--supabase-url", default=None)
    parser.add_argument("--service-key", default=None)
    args = parser.parse_args()

    hardware_id = str(uuid.uuid4())
    device_secret = secrets.token_hex(32)
    pairing_code = generate_pairing_code()

    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)

    identity = {"hardware_id": hardware_id, "device_secret": device_secret}
    (out / "identity.json").write_text(json.dumps(identity, indent=2))

    label = f"""
╔══════════════════════════════════╗
║         OBSERVAL COLLECTOR       ║
╠══════════════════════════════════╣
║  Código activación:              ║
║       {pairing_code:^16}          ║
║                                  ║
║  observal.app/app/collectors/    ║
║         activate                 ║
╚══════════════════════════════════╝
""".strip()

    (out / "label.txt").write_text(label + "\n")
    (out / "pairing-code.txt").write_text(pairing_code + "\n")
    (out / "manifest.json").write_text(
        json.dumps(
            {"hardware_id": hardware_id, "pairing_code": pairing_code, "batch_id": args.batch_id},
            indent=2,
        )
    )

    if args.register:
        url = args.supabase_url or os.environ.get("SUPABASE_URL")
        key = args.service_key or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise SystemExit("Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for --register")

        register_in_supabase(url, key, hardware_id, device_secret, pairing_code, args.batch_id)

    print(label)
    print()
    print(f"Files written to {out.resolve()}")
    print("  identity.json  → copy to Pi /etc/observal/identity.json")
    print("  label.txt      → print on device sticker")


if __name__ == "__main__":
    main()
