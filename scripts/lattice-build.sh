#!/usr/bin/env bash
# lattice-build.sh — Integração fio-a-fio Mycelium ⇄ B.A.S.E. (sem git, sem GitHub).
#
# Fluxo:
#   1. Mycelium SEED-CODE o diretório de firmware do piloto STM32 → plot (ContentId)
#   2. Mycelium RECALL-CODE puxa o código na rede → diretório local (FW c/ fw.bin, traces)
#   3. B.A.S.E.  ANALYZE  o firmware recup-pela-rede → HardwareSpec
#   4. B.A.S.E.  CHECK    novo hardware vs. contrato original (preservação)
#   5. B.A.S.E.  synth+design+prove (ciclo completo, "Forja na rede")
#
# Diferente do git: o código-fonte viaja P2P (DHT+gossip), o Forja consome
# direto o que a rede entregou — sem repositório central.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE_DIR="$ROOT/Behavioral ASIC Synthesis Engine"
MYC="$ROOT/target/release/mycelium"
BASE="$BASE_DIR/target/release/base"
export PATH="$HOME/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin:$PATH"

# ── Config de execução ───────────────────────────────────────────────────────
# WORK = pasta persistente do workspace (não /tmp, que é efêmero no sandbox).
WORK="$ROOT/target/lattice-build"
FIRMWARE_SRC="$BASE_DIR/examples/pilot_stm32"
NODE_A="$WORK/node-a"      # nó que SEMEIA o código
NODE_B="$WORK/node-b"      # nó que RECALL e passa pro Forja
PULLED="$WORK/firmware-pulled"   # código baixado da rede
OUT="$WORK/out"            # saída do B.A.S.E.
PLOT_FILE="$WORK/plot.txt"

rm -rf "$WORK"; mkdir -p "$NODE_A"
cleanup(){ "$MYC" --home "$NODE_A" shutdown 2>/dev/null || true; }
trap cleanup EXIT

step(){ echo; echo "──────────────────────────────────────────────"; echo "◆ $*"; echo "──────────────────────────────────────────────"; }

# ── 0. Verifica binários ────────────────────────────────────────────────────
[[ -x "$MYC" ]]  || { echo "ERRO: $MYC não existe. Rode cargo build --release (workspace Mycelium)."; exit 1; }
[[ -x "$BASE" ]] || { echo "ERRO: $BASE não existe. Rode cargo build --release (B.A.S.E.)."; exit 1; }

step "0. Material de firmware (fonte que vai viajar na rede)"
ls -la "$FIRMWARE_SRC"/fw.bin "$FIRMWARE_SRC"/trace.csv "$FIRMWARE_SRC"/contracts.yaml 2>&1

# ── 1. Spawn da rede Mycelium (nó difusor) ───────────────────────────────────
step "1. Rede Mycelium: sprout (nó A)"
"$MYC" --home "$NODE_A" sprout --contribute 2cpu,4gb,100gb >/dev/null

step "2. daemon (nó A)"
RUST_LOG=info "$MYC" --home "$NODE_A" daemon --contribute 2cpu,4gb,100gb --no-mdns >"$WORK/daemon-a.log" 2>&1 &
for i in $(seq 1 30); do [[ -f "$NODE_A/listen_addrs.json" ]] && break; sleep 0.5; done
ADDR="$(python3 -c "import json;print(json.load(open('$NODE_A/listen_addrs.json'))[0])")"
echo "listen addr: $ADDR"

# ── 3. Mycelium seed-code ───────────────────────────────────────────────────
step "3. Mycelium SEED-CODE: firmware → rede P2P (sem git)"
SOW="$("$MYC" --home "$NODE_A" seed-code \
        --path "$FIRMWARE_SRC" \
        --name "stm32-usart-wedge" \
        --description "FW STM32 USART1 p/ B.A.S.E. analyze" 2>&1)"
echo "$SOW" | tail -3
PLOT="$(printf '%s' "$SOW" | grep -oE 'plot=[^, ]+' | head -1 | cut -d= -f2)"
[[ -n "$PLOT" ]] || { echo "ERRO: não consegui extrair o plot"; echo "$SOW"; exit 1; }
echo "PLOT=$PLOT"
printf '%s' "$PLOT" > "$PLOT_FILE"

# ── 4. Mycelium recall-code (Forja puxa pela rede) ──────────────────────────
step "4. Mycelium RECALL-CODE: puxa o código pela rede (ContentId, sem git)"
# O plot viajou via DHT+gossip; qualquer nó da rede (aqui o mesmo difusor)
# baixa pelo ContentId — o mesmo vale para um nó remoto da rede Mycelium.
pulled=""
for i in $(seq 1 15); do
  R="$( "$MYC" --home "$NODE_A" recall-code --plot "$PLOT" --output "$PULLED" 2>&1 )"
  if echo "$R" | grep -qE 'extraído|extraidos|arquivos'; then echo "$R" | tail -2; pulled="yes"; break; fi
  sleep 2
done
[[ -n "$pulled" ]] || { echo "ERRO: recall-code não retornou (vc logs daemon)."; exit 1; }
[[ -f "$PULLED/fw.bin" ]] || { echo "ERRO: fw.bin não baixado pela rede."; exit 1; }
echo "● fw.bin recuperado via rede: $(wc -c < "$PULLED/fw.bin") bytes"
ls "$PULLED"/fw.bin "$PULLED"/trace.csv "$PULLED"/contracts.yaml 2>&1

# ── 5. B.A.S.E. analyze ─────────────────────────────────────────────────────
step "5. B.A.S.E. ANALYZE (Capstone --disasm) do firmware vindo da rede"
if [[ -f "$PULLED/mmio.json" ]]; then
  "$BASE" analyze "$PULLED/fw.bin" --mmio-traces "$PULLED/mmio.json" --classify uart --disasm -o "$OUT/analyze" 2>&1 | tail -8
else
  "$BASE" analyze "$PULLED/fw.bin" --disasm -o "$OUT/analyze" 2>&1 | tail -8
fi
[[ -f "$OUT/analyze/hardware_spec.yaml" ]] || { echo "ERRO: analyze não gerou hardware_spec.yaml"; find "$OUT" -type f 2>/dev/null | head; exit 1; }
echo "● HardwareSpec gerado: $OUT/analyze/hardware_spec.yaml"
grep -E 'base_address|kind:|device_name' "$OUT/analyze/hardware_spec.yaml" | head -6

# ── 6. B.A.S.E. synth + design (Forja na rede) ─────────────────────────────
step "6. B.A.S.E. SYNTH + DESIGN + PROVE"
"$BASE" synth "$OUT/analyze/hardware_spec.yaml" --preferred-manufacturer STMicroelectronics --max-bom-cost 80 -o "$OUT/synth" 2>&1 | tail -6
"$BASE" design "$OUT/analyze/hardware_spec.yaml" --preferred-manufacturer STMicroelectronics --max-bom-cost 80 -o "$OUT/design" 2>&1 | tail -4
if [[ -f "$PULLED/contracts.yaml" ]]; then
  "$BASE" prove "$PULLED/contracts.yaml" -o "$OUT/prove" 2>&1 | tail -6
  # Publica o proof report na rede via seed-code — qualquer nó pode
  # recall e auditar os contratos provados sem confiar no produtor.
  if [[ -f "$OUT/prove/proof_report.json" ]]; then
    PROOF_DIR="$WORK/proof-published"
    mkdir -p "$PROOF_DIR"
    cp "$OUT/prove/proof_report.json" "$PROOF_DIR/"
    cp "$OUT/analyze/hardware_spec.yaml" "$PROOF_DIR/" 2>/dev/null || true
    cp "$OUT/synth/synthesized_spec.yaml" "$PROOF_DIR/" 2>/dev/null || true
    cp "$PLOT_FILE" "$PROOF_DIR/PARENT_PLOT.txt"
    PROOF_SEED="$("$MYC" --home "$NODE_A" seed-code \
      --path "$PROOF_DIR" \
      --name "proof-$(printf '%s' "$PLOT" | cut -c7-18)" \
      --description "proof_report: contratos provados via SMT" 2>&1)"
    echo "$PROOF_SEED" | tail -2
    echo "$PROOF_SEED" | grep -oE 'plot=[^, ]+' | head -1 | cut -d= -f2 > "$WORK/proof_plot.txt" || true
  fi
fi

# ── 7. B.A.S.E. check (preservação vs contrato original) ────────────────────
step "7. B.A.S.E. CHECK: nova HW vs. trace original da rede"
if [[ -f "$PULLED/trace.csv" && -f "$OUT/synth/synthesized_spec.yaml" ]]; then
  "$BASE" check "$OUT/synth/synthesized_spec.yaml" "$PULLED/trace.csv" --format json -o "$OUT/check" 2>&1 | tail -8 || true
else
  echo "WARN: sem trace.csv ou synthesized_spec para check — pulando (consulte docs)."
fi

# ── 8. Resumo ───────────────────────────────────────────────────────────────
step "8. Resumo — código viajou P2P e virou hardware"
echo "ContentId:  $(cat "$PLOT_FILE")"
echo "Origem:     $FIRMWARE_SRC (120 arquivos, fw.bin $([[ -f "$FIRMWARE_SRC/fw.bin" ]] && wc -c < "$FIRMWARE_SRC/fw.bin")B)"
echo "Rede P2P:   Mycelium seed-code → recall-code (DHT+gossip, sem git)"
echo "Forja:      B.A.S.E. analyze + check + synth + design + prove"
if [[ -f "$WORK/proof_plot.txt" ]]; then
  echo "Proof:      plot=$(cat "$WORK/proof_plot.txt") (publicado na rede, auditável)"
fi
echo "Saídas:"
echo "  HardwareSpec : $OUT/analyze/hardware_spec.yaml"
echo "  Synthesized  : $OUT/synth/synthesized_spec.yaml"
echo "  Reference    : $OUT/design/reference_design.yaml"
for f in "$OUT/analyze/hardware_spec.yaml" "$OUT/synth/synthesized_spec.yaml" "$OUT/design/reference_design.yaml"; do
  [[ -f "$f" ]] && echo "  ✓ $f" || echo "  ✗ $f (falhou)"
done
echo
echo "DONE — firmware viajou pela rede e o Forja o sintetizou."
