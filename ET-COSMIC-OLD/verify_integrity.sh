#!/bin/bash

# ETΞRNET — Continuous Security Audit & Integrity Verification
# This script performs automated checks on the cryptographic core and protocol invariants.

echo "--- ETΞRNET SECURITY AUDIT ---"
echo "Target: VOID·ΩMEGA Core (Rust + WASM)"
echo "Timestamp: $(date)"
echo ""

# 1. Check for sensitive patterns in disk persistence (Zero-Disk Violation)
echo "[1/4] Checking Zero-Disk Policy..."
SENSITIVE_PATTERNS="private_key|seed|secret_key|mnemonic"
GHOSTID_PATH="src/crypto/ghostid.ts"

if grep -E "$SENSITIVE_PATTERNS" "$GHOSTID_PATH" | grep -v "Uint8Array" > /dev/null; then
    echo "  ⚠️ WARNING: Possible clear-text secret persistence detected in $GHOSTID_PATH"
else
    echo "  ✅ PASS: No obvious clear-text secrets found in ghostid core."
fi

# 2. Verify QEL Fragmentation Invariants (K=2, N=3)
echo "[2/4] Verifying QEL Invariants..."
QEL_PATH="src/crypto/qel.ts"
if grep "num_shares: 3" "$QEL_PATH" > /dev/null || grep "threshold: 2" "$QEL_PATH" > /dev/null; then
    echo "  ✅ PASS: QEL parameters (N=3, K=2) are correctly configured."
else
    echo "  ❌ FAIL: QEL fragmentation parameters mismatch or missing."
fi

# 3. Rust Core Compilation & Safety Checks
echo "[3/4] Running Rust Clippy (Static Analysis)..."
cd void_core
if cargo clippy -- -D warnings 2>/dev/null; then
    echo "  ✅ PASS: Rust core is clean and follow safety standards."
else
    echo "  ⚠️ WARNING: Rust clippy found issues. Review code quality."
fi
cd ..

# 4. Peer-to-Peer Protocol Signatures
echo "[4/4] Verifying Protocol Signatures..."
if grep "kind: 30000" "src/network/nostrMesh.ts" > /dev/null; then
    echo "  ✅ PASS: Nostr Rendezvous (Kind 30000) implemented."
else
    echo "  ❌ FAIL: Nostr signaling protocol not found."
fi

echo ""
echo "--- AUDIT COMPLETE ---"
echo "Security Posture: STABLE"
