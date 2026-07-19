#!/usr/bin/env python3
"""Register Observal Pi devices in factory inventory."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from factory_lib import register_one_device  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description="Register Observal Pi for factory inventory")
    parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL"))
    parser.add_argument("--service-key", default=os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
    parser.add_argument("--batch-id", default=None)
    parser.add_argument("--count", type=int, default=1, help="Register N devices (batch mode)")
    args = parser.parse_args()

    if not args.supabase_url or not args.service_key:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")

    for i in range(args.count):
        device = register_one_device(args.supabase_url, args.service_key, args.batch_id)
        print(f"── Device {i + 1}/{args.count} ──")
        print(f"Hardware ID:   {device['hardware_id']}")
        print(f"Pairing code:  {device['pairing_code']}")
        print(f"Device secret: {device['device_secret']}")
        print()


if __name__ == "__main__":
    main()
