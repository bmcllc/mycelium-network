"""Motor QRC — STA + LUT + Lieb-Robinson."""

from .sta_geodesic import (
    compile_trajectory_lut,
    evaluate_spread,
    lieb_robinson_limit,
    resolve_sta_geodesic,
    sta_sin2_geodesic,
)

__all__ = [
    "compile_trajectory_lut",
    "evaluate_spread",
    "lieb_robinson_limit",
    "resolve_sta_geodesic",
    "sta_sin2_geodesic",
]
