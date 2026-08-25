"""
STS leve — testes estatísticos rápidos em bytes (não certificação NIST oficial).
"""

from __future__ import annotations

from typing import Any


def _bits_from_bytes(data: bytes) -> list[int]:
    bits: list[int] = []
    for b in data:
        for i in range(7, -1, -1):
            bits.append((b >> i) & 1)
    return bits


def monobit_test(bits: list[int]) -> dict[str, Any]:
    n = len(bits)
    if n < 100:
        return {"name": "monobit", "passed": False, "reason": "too_few_bits", "n": n}
    s = sum(1 if b == 1 else -1 for b in bits)
    s_obs = abs(s) / (n**0.5)
    passed = s_obs < 3.29  # ~99% para demo
    return {"name": "monobit", "passed": passed, "s_obs": round(s_obs, 4), "n": n}


def runs_test(bits: list[int]) -> dict[str, Any]:
    n = len(bits)
    if n < 100:
        return {"name": "runs", "passed": False, "reason": "too_few_bits", "n": n}
    runs = 1
    for i in range(1, n):
        if bits[i] != bits[i - 1]:
            runs += 1
    pi = sum(bits) / n
    if abs(pi - 0.5) > 0.03:
        return {"name": "runs", "passed": False, "reason": "bias", "pi": round(pi, 4)}
    passed = runs >= n / 10 and runs <= n * 0.9
    return {"name": "runs", "passed": passed, "runs": runs, "n": n}


def sts_light_suite(data: bytes, *, min_bytes: int = 128) -> dict[str, Any]:
    if len(data) < min_bytes:
        return {
            "suite": "sts_light_v1",
            "passed": None,
            "skipped": True,
            "reason": f"need_{min_bytes}_bytes",
            "tests": [],
            "byte_length": len(data),
        }
    bits = _bits_from_bytes(data)
    tests = [monobit_test(bits), runs_test(bits)]
    passed = all(t.get("passed") for t in tests)
    return {
        "suite": "sts_light_v1",
        "passed": passed,
        "skipped": False,
        "tests": tests,
        "byte_length": len(data),
    }
