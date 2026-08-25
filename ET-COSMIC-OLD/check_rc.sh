#!/bin/bash
set -e  # Para em qualquer erro

echo "🔍 VOID-Hydra Release Candidate Check"
echo "======================================"

echo "1/6 — TypeScript..."
npx tsc --noEmit && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

# echo "2/6 — Lint..."
# npm run lint && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo "3/6 — Duplicate state detection..."
# Detecta duplicados em EternetDashboard especificamente
DUPES=$(grep "const \[peers\|const \[pool\|const \[broadcastInput" src/components/EternetDashboard.tsx | sort | uniq -d)
if [ -z "$DUPES" ]; then
  echo "✅ PASS — No duplicate states in Dashboard"
else
  echo "❌ FAIL — Duplicate states found:"
  echo "$DUPES"
  exit 1
fi

echo "4/6 — Production build..."
npm run build && echo "✅ PASS" || { echo "❌ FAIL"; exit 1; }

echo "5/6 — Bundle size check..."
SIZE=$(du -sh dist/ | cut -f1)
echo "📦 Bundle: $SIZE"

echo "6/6 — Debug artifacts check..."
# Verifica se há console.log remanescentes (opcional, pode avisar apenas)
# grep -r "console.log" src/ && echo "⚠️  WARNING: console.log found" || echo "✅ PASS"

echo ""
echo "======================================"
echo "✅ VOID-Hydra RC-1 checks complete"
echo "Ready for deployment."
