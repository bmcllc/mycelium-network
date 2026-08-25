"""Compilador de trajetórias → LUT (VOID-QRC Fase 2)."""

from __future__ import annotations

import json
from pathlib import Path

from .sta_geodesic import compile_trajectory_lut


def compile_to_json(scale: float = 1.0) -> str:
    lut = compile_trajectory_lut(scale=scale)
    return json.dumps({"scale": scale, "entries": lut}, indent=2)


def write_lut(path: Path, scale: float = 1.0) -> Path:
    path.write_text(compile_to_json(scale=scale), encoding="utf-8")
    return path


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    out = root / "core" / "motor_qrc" / "trajectory_lut.json"
    write_lut(out)
    print(f"LUT → {out}")
