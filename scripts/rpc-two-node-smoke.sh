#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="${MYCELIUM_BIN:-$ROOT/target/debug/mycelium}"
TMP="${TMPDIR:-/tmp}/mycelium-rpc-smoke-$$"
PROVIDER_HOME="$TMP/provider"
CLIENT_HOME="$TMP/client"
MOCK_PY="$TMP/mock_base.py"
MOCK_LOG="$TMP/mock-base.log"
PROVIDER_LOG="$TMP/provider.log"
CLIENT_LOG="$TMP/client.log"

mkdir -p "$PROVIDER_HOME" "$CLIENT_HOME"

free_port() {
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
}

BASE_PORT="$(free_port)"
GATEWAY_PORT="$(free_port)"

cleanup() {
  set +e
  if [[ -x "$BIN" ]]; then
    "$BIN" --home "$CLIENT_HOME" shutdown >/dev/null 2>&1 || true
    "$BIN" --home "$PROVIDER_HOME" shutdown >/dev/null 2>&1 || true
  fi
  [[ -n "${CLIENT_PID:-}" ]] && kill "$CLIENT_PID" >/dev/null 2>&1 || true
  [[ -n "${PROVIDER_PID:-}" ]] && kill "$PROVIDER_PID" >/dev/null 2>&1 || true
  [[ -n "${MOCK_PID:-}" ]] && kill "$MOCK_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

if [[ ! -x "$BIN" ]]; then
  echo "[rpc-smoke] binário ausente; compilando mycelium-cli"
  (cd "$ROOT" && cargo build -p mycelium-cli)
fi

cat >"$MOCK_PY" <<'PY'
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1])

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("content-length", "0"))
        raw = self.rfile.read(n)
        try:
            req = json.loads(raw)
            method = req.get("method")
            rid = req.get("id")
            if method == "eth_chainId":
                out = {"jsonrpc":"2.0","id":rid,"result":"0x2105"}
            elif method == "eth_blockNumber":
                out = {"jsonrpc":"2.0","id":rid,"result":"0x123456"}
            else:
                out = {
                    "jsonrpc":"2.0",
                    "id":rid,
                    "error":{"code":-32601,"message":"mock method not found"},
                }
            body = json.dumps(out, separators=(",", ":")).encode()
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as exc:
            body = json.dumps({
                "jsonrpc":"2.0","id":None,
                "error":{"code":-32603,"message":str(exc)}
            }).encode()
            self.send_response(500)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass

ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
PY

python3 "$MOCK_PY" "$BASE_PORT" >"$MOCK_LOG" 2>&1 &
MOCK_PID=$!

echo "[rpc-smoke] mock Base RPC: http://127.0.0.1:$BASE_PORT"

"$BIN" --home "$PROVIDER_HOME" daemon   --listen /ip4/127.0.0.1/tcp/0   --horizon-port 0   --no-mdns   --rpc-provider "http://127.0.0.1:$BASE_PORT"   --rpc-chain-id 8453   >"$PROVIDER_LOG" 2>&1 &
PROVIDER_PID=$!

status_until() {
  local home="$1"
  local pattern="$2"
  local out=""
  for _ in $(seq 1 100); do
    out="$("$BIN" --home "$home" status 2>/dev/null || true)"
    if grep -q "$pattern" <<<"$out"; then
      printf '%s\n' "$out"
      return 0
    fi
    sleep 0.1
  done
  echo "[rpc-smoke] timeout aguardando status: $pattern" >&2
  return 1
}

PSTATUS="$(status_until "$PROVIDER_HOME" 'rpc_provider: sim')"
PNODE="$(awk -F': ' '/NodeId/{print $2; exit}' <<<"$PSTATUS" | xargs)"
PPEER="$(awk -F': ' '/PeerId/{print $2; exit}' <<<"$PSTATUS" | xargs)"
PKEM="$(awk -F': ' '/rpc_kem_pub/{print $2; exit}' <<<"$PSTATUS" | xargs)"

if [[ -z "$PNODE" || -z "$PPEER" || -z "$PKEM" ]]; then
  echo "[rpc-smoke] status do provider incompleto" >&2
  echo "$PSTATUS" >&2
  exit 1
fi

BOOTSTRAP="$(python3 - "$PROVIDER_HOME/listen_addrs.json" <<'PY'
import json, sys, time
p = sys.argv[1]
for _ in range(100):
    try:
        addrs = json.load(open(p))
        tcp = [a for a in addrs if "/tcp/" in a and "/quic" not in a]
        if tcp:
            print(tcp[0])
            raise SystemExit(0)
    except FileNotFoundError:
        pass
    time.sleep(.1)
raise SystemExit("nenhum endereço TCP do provider")
PY
)"
if [[ "$BOOTSTRAP" != *"/p2p/"* ]]; then
  BOOTSTRAP="$BOOTSTRAP/p2p/$PPEER"
fi

echo "[rpc-smoke] provider NodeId: $PNODE"
echo "[rpc-smoke] provider PeerId: $PPEER"
echo "[rpc-smoke] provider KEM pub: ${PKEM:0:24}..."
echo "[rpc-smoke] bootstrap: $BOOTSTRAP"

"$BIN" --home "$CLIENT_HOME" daemon   --listen /ip4/127.0.0.1/tcp/0   --horizon-port 0   --no-mdns   --bootstrap "$BOOTSTRAP"   --rpc-gateway "127.0.0.1:$GATEWAY_PORT"   --rpc-provider-node "$PNODE"   --rpc-provider-kem "$PKEM"   --rpc-chain-id 8453   --rpc-ttl-ms 3000   >"$CLIENT_LOG" 2>&1 &
CLIENT_PID=$!

status_until "$CLIENT_HOME" 'rpc_gateway' >/dev/null

# Dá tempo para a anastomose + troca de PeerBinding/assinatura gossipsub.
for _ in $(seq 1 80); do
  CSTATUS="$("$BIN" --home "$CLIENT_HOME" status 2>/dev/null || true)"
  NEIGHBORS="$(awk -F': ' '/vizinhos/{gsub(/ /,"",$2); print $2; exit}' <<<"$CSTATUS")"
  if [[ "${NEIGHBORS:-0}" -ge 1 ]]; then
    break
  fi
  sleep 0.1
done
sleep 0.5

RPC_URL="http://127.0.0.1:$GATEWAY_PORT"

echo "[rpc-smoke] testando eth_chainId em $RPC_URL"
CHAIN=""
for _ in $(seq 1 8); do
  CHAIN="$(curl -sS --max-time 5     -H 'Content-Type: application/json'     --data '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'     "$RPC_URL" 2>/dev/null || true)"
  if grep -q '"result":"0x2105"' <<<"$CHAIN"; then
    break
  fi
  sleep 0.5
done
if ! grep -q '"result":"0x2105"' <<<"$CHAIN"; then
  echo "[rpc-smoke] FAIL eth_chainId: $CHAIN" >&2
  echo "--- provider.log ---" >&2
  tail -80 "$PROVIDER_LOG" >&2 || true
  echo "--- client.log ---" >&2
  tail -80 "$CLIENT_LOG" >&2 || true
  exit 1
fi
echo "[rpc-smoke] PASS eth_chainId: $CHAIN"

echo "[rpc-smoke] verificando write-deny"
WRITE_BODY="$(curl -sS --max-time 5   -H 'Content-Type: application/json'   --data '{"jsonrpc":"2.0","id":2,"method":"eth_sendRawTransaction","params":["0x00"]}'   "$RPC_URL" 2>/dev/null || true)"
if ! grep -q 'bloqueado' <<<"$WRITE_BODY"; then
  echo "[rpc-smoke] FAIL write-deny: $WRITE_BODY" >&2
  exit 1
fi
echo "[rpc-smoke] PASS write-deny"

count_dtn() {
  if [[ ! -d "$CLIENT_HOME/dtn" ]]; then
    echo 0
    return 0
  fi
  find "$CLIENT_HOME/dtn" -type f -name '*.json' -print | wc -l | tr -d ' '
}
DTN_BEFORE="$(count_dtn)"

echo "[rpc-smoke] desligando provider para provar fail-closed sem store-and-forward"
"$BIN" --home "$PROVIDER_HOME" shutdown >/dev/null 2>&1 || true
for _ in $(seq 1 50); do
  if ! kill -0 "$PROVIDER_PID" 2>/dev/null; then
    break
  fi
  sleep 0.1
done
sleep 0.5

OFFLINE="$(curl -sS --max-time 5   -H 'Content-Type: application/json'   --data '{"jsonrpc":"2.0","id":3,"method":"eth_blockNumber","params":[]}'   "$RPC_URL" 2>/dev/null || true)"
if grep -q '"result"' <<<"$OFFLINE"; then
  echo "[rpc-smoke] FAIL provider offline respondeu como sucesso: $OFFLINE" >&2
  exit 1
fi

DTN_AFTER="$(count_dtn)"
if [[ "$DTN_AFTER" != "$DTN_BEFORE" ]]; then
  echo "[rpc-smoke] FAIL RPC offline alterou DTN store: $DTN_BEFORE -> $DTN_AFTER" >&2
  exit 1
fi

echo "[rpc-smoke] PASS provider offline: falha sem persistir RPC"
echo "[rpc-smoke] PASS P1/P2 básico"
echo "[rpc-smoke] logs em $TMP"
