"""Testes Hermiticidade e conservação de probabilidade — gate VOID-QRC Fase 1."""

from __future__ import annotations

import numpy as np
import pytest

from core.tensor_networks.hermiticity import (
    assert_hermitian,
    hermitian_residual,
    is_hermitian,
    is_unitary,
    isometry_residual,
    probability_conserved,
    probability_norm,
)
from core.tensor_networks.mera_compiler import _random_disentangler, _random_isometry
from core.tensor_networks.spin_networks import create_spin_network, spin_network_stats, validate_network
from core.hamiltonians.anderson import anderson_hamiltonian_1d, anderson_stress_test


class TestHermiticity:
    def test_identity_hermitian(self):
        i4 = np.eye(4)
        assert is_hermitian(i4)
        assert hermitian_residual(i4) < 1e-12

    def test_non_hermitian_detected(self):
        m = np.array([[1, 2], [0, 1]], dtype=float)
        assert not is_hermitian(m)
        with pytest.raises(AssertionError):
            assert_hermitian(m)

    def test_anderson_hamiltonian_hermitian_sweep(self):
        for w in (0.1, 0.5, 1.0, 2.5, 5.0):
            h = anderson_hamiltonian_1d(16, W=w, seed=int(w * 10))
            assert is_hermitian(h)


class TestProbabilityConservation:
    def test_mera_isometry_orthonormal_columns(self):
        iso = _random_isometry(8, 4)
        assert isometry_residual(iso) < 1e-7

    def test_mera_disentangler_unitary(self):
        u = _random_disentangler(4)
        assert is_unitary(u)

    def test_state_norm_preserved_under_unitary(self):
        u = _random_disentangler(4)
        psi = np.random.randn(4) + 1j * np.random.randn(4)
        psi /= np.linalg.norm(psi)
        evolved = u @ psi
        assert probability_conserved(psi, evolved)
        assert abs(probability_norm(evolved) - 1.0) < 1e-10


class TestSpinNetwork:
    def test_create_and_validate(self):
        net = create_spin_network([0.5, 1.0, 0.5, 1.0])
        v = validate_network(net)
        assert v.get("triangles_ok", True)
        assert spin_network_stats(net)["num_nodes"] >= 4


class TestAndersonStress:
    def test_sku_profiles_hermitian(self):
        for profile in ("SKU-A", "SKU-B"):
            r = anderson_stress_test(profile=profile)
            assert r.hermitian

    def test_sku_b_more_localized_than_a(self):
        """SKU-B (W alto) tende a estados mais localizados que SKU-A."""
        ra = anderson_stress_test(n=48, profile="SKU-A", seed=7)
        rb = anderson_stress_test(n=48, profile="SKU-B", seed=7)
        assert rb.participation_ratio <= ra.participation_ratio * 1.05
