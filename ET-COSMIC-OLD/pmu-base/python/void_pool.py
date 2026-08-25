"""
Pool soberano de entropia — append-only JSONL + cadeia SHA3.
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any

from _paths import chain_path, pulses_path, void_pool_dir


def _ensure_dirs() -> None:
    void_pool_dir().mkdir(parents=True, exist_ok=True)
    (void_pool_dir() / "reports").mkdir(parents=True, exist_ok=True)


def _read_chain_tip() -> str:
    p = chain_path()
    if not p.is_file():
        return "0" * 64
    return p.read_text(encoding="utf-8").strip()[:64]


def append_pulse(
    entropy_sha3: str,
    sources: list[str],
    *,
    tier: str = "omega",
    simulation: bool = True,
    quantum_verified: bool = False,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    _ensure_dirs()
    prev = _read_chain_tip()
    ts = int(time.time() * 1000)
    record: dict[str, Any] = {
        "ts": ts,
        "tier": tier,
        "entropy_sha3": entropy_sha3,
        "sources": sources,
        "simulation": simulation,
        "quantum_verified": quantum_verified,
        "prev_chain": prev,
    }
    if extra:
        record["extra"] = extra

    link = hashlib.sha3_256(
        f"{prev}:{entropy_sha3}:{ts}:{','.join(sources)}".encode()
    ).hexdigest()
    record["chain_hash"] = link

    with pulses_path().open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    chain_path().write_text(link + "\n", encoding="utf-8")

    return record


def pool_status() -> dict[str, Any]:
    _ensure_dirs()
    pulses = 0
    if pulses_path().is_file():
        with pulses_path().open(encoding="utf-8") as f:
            pulses = sum(1 for line in f if line.strip())
    return {
        "pool_dir": str(void_pool_dir()),
        "pulses": pulses,
        "chain_tip": _read_chain_tip()[:16] + "…",
        "pulses_file": str(pulses_path()),
    }
