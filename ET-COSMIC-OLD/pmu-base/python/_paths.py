"""Paths compartilhados ET-RNET ↔ VOID-COSMIC_VPS."""

from __future__ import annotations

import os
from pathlib import Path


def etrnet_root() -> Path:
    env = os.environ.get("ET_RNET_ROOT")
    if env:
        return Path(env).resolve()
    return Path(__file__).resolve().parents[2]


def void_pool_dir() -> Path:
    env = os.environ.get("VOID_POOL_DIR")
    if env:
        return Path(env).resolve()
    return etrnet_root() / "void_pool"


def reports_dir() -> Path:
    return void_pool_dir() / "reports"


def pulses_path() -> Path:
    return void_pool_dir() / "pulses.jsonl"


def chain_path() -> Path:
    return void_pool_dir() / "chain.sha3"
