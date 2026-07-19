"""Encrypted local vault for secrets and offline buffer."""

from __future__ import annotations

import json
import os
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class Vault:
    def __init__(self, data_dir: Path, device_secret: bytes) -> None:
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._key = device_secret[:32].ljust(32, b"\0")

    def _encrypt(self, plaintext: bytes) -> bytes:
        nonce = os.urandom(12)
        aesgcm = AESGCM(self._key)
        return nonce + aesgcm.encrypt(nonce, plaintext, None)

    def _decrypt(self, blob: bytes) -> bytes:
        nonce, ciphertext = blob[:12], blob[12:]
        aesgcm = AESGCM(self._key)
        return aesgcm.decrypt(nonce, ciphertext, None)

    def save_secrets(self, secrets: dict) -> None:
        path = self.data_dir / "secrets.enc"
        path.write_bytes(self._encrypt(json.dumps(secrets).encode()))

    def load_secrets(self) -> dict:
        path = self.data_dir / "secrets.enc"
        if not path.exists():
            return {}
        return json.loads(self._decrypt(path.read_bytes()))

    def save_buffer_batch(self, batch_id: str, payload: dict) -> None:
        buffer_dir = self.data_dir / "buffer"
        buffer_dir.mkdir(exist_ok=True)
        path = buffer_dir / f"{batch_id}.enc"
        path.write_bytes(self._encrypt(json.dumps(payload).encode()))

    def list_buffer_batches(self) -> list[Path]:
        buffer_dir = self.data_dir / "buffer"
        if not buffer_dir.exists():
            return []
        return sorted(buffer_dir.glob("*.enc"))

    def load_buffer_batch(self, path: Path) -> dict:
        return json.loads(self._decrypt(path.read_bytes()))

    def delete_buffer_batch(self, path: Path) -> None:
        path.unlink(missing_ok=True)
