#!/usr/bin/env python3
"""Cria carteira LND via REST /v1/genseed + /v1/initwallet (sem TTY)."""
from __future__ import annotations

import base64
import json
import os
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PW_FILE = os.path.join(ROOT, "secrets", "wallet_password")
NETWORK = os.environ.get("BITCOIN_NETWORK", "regtest")
LND_REST = os.environ.get("LND_REST_URL", "https://127.0.0.1:8180").rstrip("/")
MACAROON_PATH = f"/root/.lnd/data/chain/bitcoin/{NETWORK}/admin.macaroon"


def _ssl_ctx() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _wallet_exists() -> bool:
    chk = subprocess.run(
        ["docker", "exec", "lnd", "test", "-f", MACAROON_PATH],
        capture_output=True,
    )
    return chk.returncode == 0


def _wait_lnd_container() -> bool:
    print("À espera do contentor LND (healthy)...")
    for _ in range(90):
        ps = subprocess.run(
            ["docker", "ps", "--filter", "name=^lnd$", "--format", "{{.Status}}"],
            capture_output=True,
            text=True,
        )
        if not ps.stdout.strip():
            time.sleep(2)
            continue
        health = subprocess.run(
            ["docker", "inspect", "-f", "{{.State.Health.Status}}", "lnd"],
            capture_output=True,
            text=True,
        )
        status = health.stdout.strip()
        if status == "healthy" or (status == "" and "Up" in ps.stdout):
            return True
        time.sleep(2)
    return False


def _rest_reachable() -> bool:
    """REST responde (200 ou erro de carteira já desbloqueada = OK)."""
    req = urllib.request.Request(f"{LND_REST}/v1/genseed")
    try:
        with urllib.request.urlopen(req, context=_ssl_ctx(), timeout=5) as r:
            r.read()
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        if "wallet already unlocked" in body or e.code in (200, 400, 500):
            return True
        return False
    except urllib.error.URLError:
        return False


def _get(path: str) -> dict:
    req = urllib.request.Request(f"{LND_REST}{path}")
    with urllib.request.urlopen(req, context=_ssl_ctx(), timeout=30) as r:
        return json.loads(r.read().decode())


def _post(path: str, body: dict) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{LND_REST}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, context=_ssl_ctx(), timeout=120) as r:
        return json.loads(r.read().decode())


def _print_macaroon() -> None:
    hex_out = subprocess.run(
        ["docker", "exec", "lnd", "xxd", "-p", "-c", "256", MACAROON_PATH],
        capture_output=True,
        text=True,
    )
    if hex_out.returncode == 0:
        print("\nMacaroon (LND_MACAROON_HEX / VITE_LND_MACAROON_HEX):")
        print(hex_out.stdout.replace("\n", ""))


def main() -> int:
    if not os.path.isfile(PW_FILE):
        print(f"Crie {PW_FILE}", file=sys.stderr)
        return 1

    pw = open(PW_FILE, encoding="utf-8").read().strip("\n\r")
    if len(pw) < 8:
        print("Password deve ter ≥8 caracteres.", file=sys.stderr)
        return 1

    if not _wait_lnd_container():
        print("LND não ficou healthy. Ver: docker logs lnd --tail 40", file=sys.stderr)
        return 1

    if _wallet_exists():
        print(f"✓ Carteira já existe ({NETWORK}) — nada a criar.")
        for _ in range(30):
            if _rest_reachable():
                break
            time.sleep(2)
        _print_macaroon()
        print("\nStack OK. Próximo: RTL http://localhost:3000 → NWC → .env → npm run dev")
        return 0

    print("À espera do REST LND (porta 8180)...")
    for _ in range(60):
        if _rest_reachable():
            break
        time.sleep(2)
    else:
        print(
            f"LND REST indisponível em {LND_REST}. "
            "Confirme: docker ps | grep lnd && curl -sk https://127.0.0.1:8180/v1/genseed",
            file=sys.stderr,
        )
        return 1

    print(f"A criar carteira ({NETWORK}) via REST...")
    seed = _get("/v1/genseed")
    body = {
        "wallet_password": base64.b64encode(pw.encode()).decode(),
        "cipher_seed_mnemonic": seed["cipher_seed_mnemonic"],
        "aezeed_passphrase": "",
        "recovery_window": 0,
    }
    try:
        result = _post("/v1/initwallet", body)
    except urllib.error.HTTPError as e:
        print(e.read().decode(), file=sys.stderr)
        return 1

    seed_file = os.path.join(ROOT, "secrets", f"lnd-mnemonic-{NETWORK}.txt")
    with open(seed_file, "w", encoding="utf-8") as f:
        f.write(" ".join(seed["cipher_seed_mnemonic"]) + "\n")
    print(f"Mnemonic guardado em {seed_file} (GUARDE EM LOCAL SEGURO)")

    admin_b64 = result.get("admin_macaroon", "")
    if admin_b64:
        print("\nMacaroon (cole em .env.sovereign):")
        print(base64.b64decode(admin_b64).hex())

    print("A reiniciar LND (auto-unlock)...")
    subprocess.run(["docker", "restart", "lnd"], check=True)
    time.sleep(10)
    _print_macaroon()
    print("\nPróximo: npm run stack:up")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
