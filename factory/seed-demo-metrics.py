#!/usr/bin/env python3
"""Insert demo metrics for charts when no collector is running."""

from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import datetime, timedelta, timezone

import httpx


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo AV metrics into Supabase")
    parser.add_argument("--hours", type=int, default=24, help="Hours of history to generate")
    parser.add_argument("--device-id", help="Target device UUID (default: first enabled device)")
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    if args.device_id:
        device_id = args.device_id
        device_resp = httpx.get(
            f"{url}/rest/v1/av_devices",
            params={"select": "id,name,organization_id,collector_id,profile", "id": f"eq.{device_id}"},
            headers=headers,
            timeout=30,
        )
        device_resp.raise_for_status()
        devices = device_resp.json()
    else:
        device_resp = httpx.get(
            f"{url}/rest/v1/av_devices",
            params={"select": "id,name,organization_id,collector_id,profile", "enabled": "eq.true", "limit": "1"},
            headers=headers,
            timeout=30,
        )
        device_resp.raise_for_status()
        devices = device_resp.json()

    if not devices:
        print("No devices found. Add one in /app/devices/add first.")
        sys.exit(1)

    device = devices[0]
    device_id = device["id"]
    org_id = device["organization_id"]
    collector_id = device.get("collector_id")
    profile = device.get("profile", "ping")
    print(f"Seeding metrics for {device['name']} ({device_id})")

    now = datetime.now(timezone.utc)
    rows: list[dict] = []
    rng = random.Random(42)

    for hour in range(args.hours):
        for minute in (0, 15, 30, 45):
            ts = now - timedelta(hours=hour, minutes=minute)
            online = rng.random() > 0.05
            rows.append(
                {
                    "organization_id": org_id,
                    "collector_id": collector_id,
                    "device_id": device_id,
                    "name": "device.reachable",
                    "value_bool": online,
                    "status": "online" if online else "offline",
                    "recorded_at": ts.isoformat(),
                }
            )
            if online and profile in ("pjlink_class1", "pjlink_class2"):
                rows.append(
                    {
                        "organization_id": org_id,
                        "collector_id": collector_id,
                        "device_id": device_id,
                        "name": "projector.lamp_hours",
                        "value_numeric": 800 + hour * 2 + rng.randint(0, 5),
                        "status": "online",
                        "recorded_at": ts.isoformat(),
                    }
                )

    resp = httpx.post(f"{url}/rest/v1/metrics", json=rows, headers=headers, timeout=60)
    resp.raise_for_status()
    print(f"Inserted {len(rows)} metric rows.")


if __name__ == "__main__":
    main()
