"""Testes geodésica STA + LUT + LR (Fase 2)."""

from core.motor_qrc.sta_geodesic import (
    compile_trajectory_lut,
    evaluate_spread,
    lieb_robinson_limit,
    resolve_sta_geodesic,
    sta_sin2_geodesic,
)


def test_sin2_bounds():
    assert 0 <= sta_sin2_geodesic(0) <= 1
    assert 0 <= sta_sin2_geodesic(100) <= 1


def test_sin2_monotone_short_range():
    a = sta_sin2_geodesic(0.5)
    b = sta_sin2_geodesic(1.0)
    assert b >= a


def test_lut_hit():
    lut = compile_trajectory_lut()
    r = resolve_sta_geodesic(1.0, lut=lut)
    assert r.used_lut
    assert abs(r.sin2 - sta_sin2_geodesic(1.0)) < 1e-9


def test_lr_violation():
    v = evaluate_spread(3.0, J=1.0)
    assert v["violated"] is True
    assert v["safetyState"] == "anderson_cage"


def test_lr_ok():
    v = evaluate_spread(0.5, J=1.0)
    assert v["violated"] is False
    assert lieb_robinson_limit(1.0) == 2.0
