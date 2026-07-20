#!/usr/bin/env python3
"""Simulate Observal collector on laptop (dev / demo without Raspberry Pi)."""

from __future__ import annotations

import os
import sys

# Dev mode: auto-generate identity if missing
os.environ.setdefault("OBSERVAL_DEV", "1")
os.environ.setdefault("OBSERVAL_DATA_DIR", "./collector/data")
# Demo mode: synthetic metrics without real AV network (override with OBSERVAL_DEMO=0)
os.environ.setdefault("OBSERVAL_DEMO", "1")

if not os.environ.get("SUPABASE_URL"):
    print("Set SUPABASE_URL=https://xxx.supabase.co")
    sys.exit(1)

from observal_collector.main import main  # noqa: E402

if __name__ == "__main__":
    main()
