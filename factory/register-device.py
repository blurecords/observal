#!/usr/bin/env python3
"""Register a new Raspberry Pi in the factory inventory (dev/staging)."""

from __future__ import annotations

import argparse
import hashlib
import os
import secrets
import string
import uuid

import httpx


def generate_pairing_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    code = "".join(secrets.choice(alphabet) for _ in range(8))
    return f"{code[:4]}-{code[4:]}"


def hash_pairing_code(code: str) -> str:
    normalized = code.replace("-", "").upper()
    return hashlib.sha256(normalized.encode()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description="Register Observal Pi for factory inventory")
    parser.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL"))
    parser.add_argument(
        "--service-key",
        default=os.environ.get("SUPABASE_SERVICE_ROLE_KEY"),
    )
    args = parser.parse_args()

    if not args.supabase_url or not args.service_key:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")

    hardware_id = str(uuid.uuid4())
    device_secret = secrets.token_hex(32)
    pairing_code = generate_pairing_code()
    code_hash = hash_pairing_code(pairing_code)

    from supabase import create_client  # optional — use REST if not installed

    try:
        client = create_client(args.supabase_url, args.service_key)
        client.table("devices_factory").insert(
            {
                "hardware_id": hardware_id,
                "pairing_code_hash": code_hash,
                "device_secret": device_secret,
                "status": "manufactured",
            }
        ).execute()
    except ImportError:
        resp = httpx.post(
            f"{args.supabase_url.rstrip('/')}/rest/v1/devices_factory",
            json={
                "hardware_id": hardware_id,
                "pairing_code_hash": code_hash,
                "device_secret": device_secret,
                "status": "manufactured",
            },
            headers={
                "apikey": args.service_key,
                "Authorization": f"Bearer {args.service_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
        )
        resp.raise_for_status()

    print("── Observal Pi registered ──")
    print(f"Hardware ID:   {hardware_id}")
    print(f"Pairing code:  {pairing_code}")
    print(f"Device secret: {device_secret}")
    print()
    print("Print the pairing code on the device label.")
    print("Flash identity.json on the Pi with hardware_id + device_secret.")


if __name__ == "__main__":
    main()
