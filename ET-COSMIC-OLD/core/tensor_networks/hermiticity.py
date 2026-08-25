"""Utilitários de Hermiticidade e conservação de probabilidade (VOID-QRC Fase 1)."""

from __future__ import annotations

import numpy as np


def hermitian_residual(matrix: np.ndarray, tol: float = 1e-10) -> float:
    """||H - H†||_max — zero para matriz Hermitiana."""
    m = np.asarray(matrix, dtype=complex)
    if m.ndim != 2 or m.shape[0] != m.shape[1]:
        raise ValueError("Matriz deve ser quadrada")
    return float(np.max(np.abs(m - m.conj().T)))


def is_hermitian(matrix: np.ndarray, tol: float = 1e-8) -> bool:
    return hermitian_residual(matrix, tol) <= tol


def unitary_residual(matrix: np.ndarray, tol: float = 1e-8) -> float:
    """||U U† - I||_max."""
    u = np.asarray(matrix, dtype=complex)
    n = u.shape[0]
    identity = np.eye(n, dtype=complex)
    return float(np.max(np.abs(u @ u.conj().T - identity)))


def is_unitary(matrix: np.ndarray, tol: float = 1e-8) -> bool:
    return unitary_residual(matrix, tol) <= tol


def isometry_residual(isometry: np.ndarray, tol: float = 1e-8) -> float:
    """||V†V - I||_max para isometria V (colunas ortonormais)."""
    v = np.asarray(isometry, dtype=complex)
    gram = v.conj().T @ v
    rank = gram.shape[0]
    return float(np.max(np.abs(gram - np.eye(rank, dtype=complex))))


def probability_norm(state: np.ndarray) -> float:
    """Norma L2 — probabilidade clássica normalizada deve ser 1."""
    s = np.asarray(state, dtype=complex).ravel()
    return float(np.sum(np.abs(s) ** 2))


def probability_conserved(
    before: np.ndarray,
    after: np.ndarray,
    rel_tol: float = 1e-6,
) -> bool:
    nb = probability_norm(before)
    na = probability_norm(after)
    if nb == 0:
        return na == 0
    return abs(na - nb) / nb <= rel_tol


def assert_hermitian(matrix: np.ndarray, label: str = "H") -> None:
    r = hermitian_residual(matrix)
    if r > 1e-8:
        raise AssertionError(f"{label} não é Hermitiana (residual={r:.2e})")
