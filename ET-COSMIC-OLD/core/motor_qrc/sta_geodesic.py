"""
Motor QRC — geodésica STA sin² (Sistema 2, emulador clássico).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Literal

SafetyState = Literal["normal", "anderson_cage"]


@dataclass(frozen=True)
class StaGeodesicResult:
    distance: float
    scale: float
    sin2: float
    effective_cost: float
    used_lut: bool


def sta_sin2_geodesic(distance: float, scale: float = 1.0) -> float:
    """
    Factor sin² sobre arco normalizado — métrica STA clássica.
    distance/scale → ângulo em [0, π]; retorna sin²(θ).
    """
    if scale <= 0:
        raise ValueError("scale > 0")
    d = max(0.0, distance)
    theta = min(math.pi, (d / scale) * (math.pi / 2))
    return math.sin(theta) ** 2


def effective_routing_cost(distance: float, scale: float = 1.0) -> float:
    """Custo efectivo = distance · sin²(θ) — usado pelo compilador LUT."""
    s2 = sta_sin2_geodesic(distance, scale)
    return d if (d := max(0.0, distance)) == 0 else d * s2


def lieb_robinson_limit(J: float) -> float:
    return 2.0 * J


def evaluate_spread(spread_rate: float, J: float = 1.0) -> Dict[str, float | bool | str]:
    v_lr = lieb_robinson_limit(J)
    violated = spread_rate > v_lr
    return {
        "vLR": v_lr,
        "spreadRate": spread_rate,
        "violated": violated,
        "safetyState": "anderson_cage" if violated else "normal",
    }


def compile_trajectory_lut(
    distances: List[float] | None = None,
    scale: float = 1.0,
) -> Dict[str, Dict[str, float]]:
    """Gera LUT C-friendly: chave string → {distance, sin2, cost}."""
    if distances is None:
        distances = [0.1, 0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 8.0, 10.0]
    out: Dict[str, Dict[str, float]] = {}
    for d in distances:
        s2 = sta_sin2_geodesic(d, scale)
        key = f"{d:.4f}"
        out[key] = {"distance": d, "sin2": s2, "cost": d * s2}
    return out


def lookup_lut(
    lut: Dict[str, Dict[str, float]],
    distance: float,
    tolerance: float = 0.05,
) -> StaGeodesicResult | None:
    """Hit LUT se distância ≈ chave standard."""
    for entry in lut.values():
        if abs(entry["distance"] - distance) <= tolerance:
            return StaGeodesicResult(
                distance=entry["distance"],
                scale=1.0,
                sin2=entry["sin2"],
                effective_cost=entry["cost"],
                used_lut=True,
            )
    return None


def resolve_sta_geodesic(
    distance: float,
    scale: float = 1.0,
    lut: Dict[str, Dict[str, float]] | None = None,
) -> StaGeodesicResult:
    if lut:
        hit = lookup_lut(lut, distance)
        if hit:
            return hit
    s2 = sta_sin2_geodesic(distance, scale)
    return StaGeodesicResult(
        distance=distance,
        scale=scale,
        sin2=s2,
        effective_cost=distance * s2,
        used_lut=False,
    )
