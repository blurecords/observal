"""Base adapter types."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PollResult:
    status: str
    metrics: list[dict[str, Any]] = field(default_factory=list)
    latency_ms: int | None = None
    error: str | None = None


class BaseAdapter(ABC):
    profile: str = "base"

    @abstractmethod
    async def poll(self, host: str, device: dict, credentials: dict) -> PollResult:
        ...
