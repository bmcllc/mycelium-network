"""
Relatório de auditoria PMU Ω — JSON exportável.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from _paths import reports_dir
from sts_light import sts_light_suite
from void_pool import append_pulse, pool_status


def classify_truth_level(
    *,
    tier: str,
    quantum_verified: bool,
    simulation: bool,
    sources: list[str],
    sts_passed: bool,
    pool_pulses: int,
) -> tuple[int, str]:
    """L0–L4 alinhado ao mapa estratégico."""
    has_anu = any("anu" in s for s in sources)
    has_cqr = any("circuit" in s or "cqr" in s for s in sources)
    has_paleo = any("paleo" in s for s in sources)

    sts_ok = sts_passed is not False  # None/skipped não bloqueia

    if tier == "omega" and quantum_verified and has_paleo and has_anu and sts_ok and pool_pulses > 0:
        return 3, "L3_omega_soberano"
    if has_anu and quantum_verified:
        return 2, "L2_hibrido_verificado"
    if tier in ("omega", "hybrid") and quantum_verified and has_cqr:
        return 2, "L2_hibrido_verificado"
    if has_cqr or tier == "cqr_only":
        return 1, "L1_simulado_rigoroso"
    return 0, "L0_degradado"


def source_breakdown(sources: list[str]) -> list[dict[str, Any]]:
    labels: dict[str, tuple[str, str]] = {
        "anu_vacuum": ("QRNG hardware (ANU)", "hardware"),
        "anu_vacuum_client": ("QRNG ANU (cliente)", "hardware"),
        "circuit_bell_z": ("Simulação quântica (quimb)", "simulation"),
        "paleo_fossil": ("Paleocomputação F(C)", "structural"),
        "void_sovereign_pool": ("Pool VOID soberano", "sovereign"),
        "nist_beacon": ("NIST Beacon (público)", "beacon"),
        "random_org_atmospheric": ("Random.org atmosférico", "hardware_classical"),
        "ibm_quantum": ("IBM Quantum (cloud)", "cloud_optional"),
    }
    out: list[dict[str, Any]] = []
    for s in sources:
        label, kind = labels.get(s, (s, "unknown"))
        out.append({"id": s, "label": label, "kind": kind})
    return out


def build_audit_report(
    entropy: dict[str, Any],
    *,
    chsh: dict[str, Any] | None = None,
    append_to_pool: bool = True,
) -> dict[str, Any]:
    material = bytes.fromhex(entropy.get("entropy_hex", "00"))
    sts = sts_light_suite(material)
    sts_passed = sts.get("passed")
    sources = list(entropy.get("sources") or [entropy.get("source", "unknown")])
    tier = str(entropy.get("tier", entropy.get("method", "unknown")))
    qv = bool(entropy.get("quantum_verified"))
    sim = bool(entropy.get("simulation", True))

    pool_before = pool_status()
    pulse_record = None
    if append_to_pool:
        pulse_record = append_pulse(
            entropy.get("sha3_256", ""),
            sources,
            tier=tier,
            simulation=sim,
            quantum_verified=qv,
            extra={"sts_passed": sts["passed"]},
        )

    pool_after = pool_status()
    level, level_id = classify_truth_level(
        tier=tier,
        quantum_verified=qv,
        simulation=sim,
        sources=sources,
        sts_passed=sts_passed if sts_passed is not None else True,
        pool_pulses=int(pool_after.get("pulses", 0)),
    )

    report: dict[str, Any] = {
        "schema": "etrnet/pmu-audit/v1",
        "generated_at": int(time.time() * 1000),
        "truth_level": level,
        "truth_level_id": level_id,
        "entropy": {
            "sha3_256": entropy.get("sha3_256"),
            "tier": tier,
            "method": entropy.get("method"),
            "quantum_verified": qv,
            "simulation": sim,
            "sources": sources,
            "source_breakdown": source_breakdown(sources),
        },
        "chsh_audit": chsh or entropy.get("chsh_audit"),
        "sts_light": sts,
        "paleo_fossil": entropy.get("paleo_fossil"),
        "void_pool": {
            "before": pool_before,
            "pulse": pulse_record,
            "after": pool_after,
        },
        "disclaimer": (
            "CQR = simulação quimb (shots reais no modelo). "
            "ANU = hardware. IBM não é necessário."
        ),
    }
    return report


def save_report(report: dict[str, Any], name: str | None = None) -> Path:
    reports_dir().mkdir(parents=True, exist_ok=True)
    ts = report.get("generated_at", int(time.time() * 1000))
    fname = name or f"pmu-audit-{ts}.json"
    path = reports_dir() / fname
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return path
