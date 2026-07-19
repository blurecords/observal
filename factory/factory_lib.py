"""Shared factory registration utilities."""

from __future__ import annotations

import hashlib
import secrets
import uuid

import httpx


def generate_pairing_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    code = "".join(secrets.choice(alphabet) for _ in range(8))
    return f"{code[:4]}-{code[4:]}"


def hash_pairing_code(code: str) -> str:
    normalized = code.replace("-", "").upper()
    return hashlib.sha256(normalized.encode()).hexdigest()


def register_in_supabase(
    supabase_url: str,
    service_key: str,
    hardware_id: str,
    device_secret: str,
    pairing_code: str,
    batch_id: str | None = None,
    status: str = "manufactured",
) -> None:
    code_hash = hash_pairing_code(pairing_code)
    resp = httpx.post(
        f"{supabase_url.rstrip('/')}/rest/v1/devices_factory",
        json={
            "hardware_id": hardware_id,
            "pairing_code_hash": code_hash,
            "device_secret": device_secret,
            "batch_id": batch_id,
            "status": status,
        },
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        timeout=30,
    )
    resp.raise_for_status()


def register_one_device(
    supabase_url: str,
    service_key: str,
    batch_id: str | None = None,
) -> dict[str, str]:
    hardware_id = str(uuid.uuid4())
    device_secret = secrets.token_hex(32)
    pairing_code = generate_pairing_code()
    register_in_supabase(
        supabase_url,
        service_key,
        hardware_id,
        device_secret,
        pairing_code,
        batch_id,
    )
    return {
        "hardware_id": hardware_id,
        "device_secret": device_secret,
        "pairing_code": pairing_code,
    }
