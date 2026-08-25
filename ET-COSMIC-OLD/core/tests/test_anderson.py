from core.hamiltonians.anderson import (
    anderson_stress_test,
    disorder_for_profile,
    participation_ratio,
)


def test_disorder_sku_ordering():
    assert disorder_for_profile("SKU-A") < disorder_for_profile("SKU-B")


def test_participation_ratio_bounded():
    import numpy as np

    psi = np.ones(8) / np.sqrt(8)
    pr = participation_ratio(psi)
    assert 1.0 <= pr <= 8.0


def test_anderson_stress_reproducible():
    a = anderson_stress_test(seed=99)
    b = anderson_stress_test(seed=99)
    assert a.ground_energy == b.ground_energy
    assert a.participation_ratio == b.participation_ratio
