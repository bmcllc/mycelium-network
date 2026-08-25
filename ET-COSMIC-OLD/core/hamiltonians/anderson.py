"""Hamiltonianos D-LQA — matéria condensada (VOID-QRC Fase 1)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np

from ..tensor_networks.hermiticity import assert_hermitian, is_hermitian

SkuProfile = Literal["SKU-A", "SKU-B"]


@dataclass(frozen=True)
class AndersonResult:
    """Resultado do stress test Jaula de Anderson."""

    n: int
    J: float
    W: float
    profile: SkuProfile
    hermitian: bool
    participation_ratio: float
    ground_energy: float
    localized: bool


def disorder_for_profile(profile: SkuProfile) -> float:
    """SKU-A: baixa desordem (latência) · SKU-B: alta (retenção/memória)."""
    return 0.4 if profile == "SKU-A" else 2.5


def anderson_hamiltonian_1d(
    n: int,
    J: float = 1.0,
    W: float = 1.0,
    seed: int = 0,
) -> np.ndarray:
    """
    Hamiltoniano tight-binding 1D com desordem onsite uniforme em [-W/2, W/2].
    H_ij = -J (c_i† c_{i+1} + h.c.) + Σ_i ε_i n_i
    """
    if n < 2:
        raise ValueError("n >= 2")
    rng = np.random.default_rng(seed)
    h = np.zeros((n, n), dtype=float)
    for i in range(n - 1):
        h[i, i + 1] = -J
        h[i + 1, i] = -J
    for i in range(n):
        h[i, i] = float(rng.uniform(-W / 2, W / 2))
    assert_hermitian(h, "Anderson H")
    return h


def participation_ratio(psi: np.ndarray) -> float:
    """Razão de participação IPR⁻¹ — baixa ⇒ localizado (Anderson)."""
    s = np.asarray(psi, dtype=float).ravel()
    norm = np.sum(s * s)
    if norm <= 0:
        return 0.0
    s = s / np.sqrt(norm)
    return float(1.0 / np.sum(s**4))


def anderson_stress_test(
    n: int = 32,
    J: float = 1.0,
    profile: SkuProfile = "SKU-A",
    seed: int = 42,
) -> AndersonResult:
    """
    Stress test Anderson — métrica industrial por SKU.
    Localizado se PR < n/4 (heurística regtest).
    """
    W = disorder_for_profile(profile)
    h = anderson_hamiltonian_1d(n, J=J, W=W, seed=seed)
    evals, evecs = np.linalg.eigh(h)
    psi0 = evecs[:, 0]
    pr = participation_ratio(psi0)
    localized = pr < (n / 4.0)
    return AndersonResult(
        n=n,
        J=J,
        W=W,
        profile=profile,
        hermitian=is_hermitian(h),
        participation_ratio=pr,
        ground_energy=float(evals[0]),
        localized=localized,
    )
