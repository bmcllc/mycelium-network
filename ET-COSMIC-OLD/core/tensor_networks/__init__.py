"""Redes tensoriais LUSUS-Q — migrado de quantum/ (VOID-QRC Fase 1)."""

from .hermiticity import (
    assert_hermitian,
    hermitian_residual,
    is_hermitian,
    is_unitary,
    isometry_residual,
    probability_conserved,
    probability_norm,
    unitary_residual,
)
from .mera_compiler import MERA, MERACompiler, DiscretizationLayer, mera_stats
from .spin_networks import (
    SpinEdge,
    SpinFoam,
    SpinNetwork,
    SpinNode,
    amplitude,
    create_spin_network,
    pachner_move_23,
    spin_network_stats,
    validate_network,
)

__all__ = [
    "MERA",
    "MERACompiler",
    "DiscretizationLayer",
    "SpinEdge",
    "SpinFoam",
    "SpinNetwork",
    "SpinNode",
    "amplitude",
    "assert_hermitian",
    "create_spin_network",
    "hermitian_residual",
    "is_hermitian",
    "is_unitary",
    "isometry_residual",
    "mera_stats",
    "pachner_move_23",
    "probability_conserved",
    "probability_norm",
    "spin_network_stats",
    "unitary_residual",
    "validate_network",
]
