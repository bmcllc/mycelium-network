# Carregar no fish: source scripts/pmu-env-fish.fish
# Edite os endereços reais antes de usar anchor on-chain.

set -gx ET_RNET_ROOT /home/bruno/Documentos/ET-COSMIC
set -gx VOID_POOL_DIR /home/bruno/Documentos/ET-COSMIC/void_pool
set -gx QUANTUM_API http://127.0.0.1:8472

# Anchor: preferir ficheiros (npm run anchor:local grava tudo)
#   .env.sovereign  → VITE_ETRNET_ANCHOR_ADDRESS
#   pmu.env → ETRNET_ANCHOR_ADDRESS, ANCHOR_RPC_URL, ANCHOR_PRIVATE_KEY
#
# Só se precisar na sessão Fish:
# set -gx ETRNET_ANCHOR_ADDRESS 0x...
# set -gx ANCHOR_RPC_URL http://127.0.0.1:8545
# set -gx ANCHOR_PRIVATE_KEY 0x...

echo "pmu-env-fish: ET_RNET_ROOT=$ET_RNET_ROOT"
