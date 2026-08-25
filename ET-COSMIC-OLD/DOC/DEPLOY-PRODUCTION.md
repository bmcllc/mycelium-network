# ETΞRNET — Guia de Deploy de Produção

> **Documento secundário** · Apoio a [VOID-QRC — Plano Principal](../docs/obsidian/VOID-QRC-PLANO-INDUSTRIA.md) · **Fase 3–4** — deploy produção

> **Filosofia de deploy (A + B, sem VPS/túnel público):** ver **[FILOSOFIA-DEPLOY.md](./FILOSOFIA-DEPLOY.md)** — Perfil A (APK soberano) + Perfil B opcional (LAN/tailnet).

> **Regra absoluta:** Em produção (`NODE_ENV=production`), o servidor **exige LND real**.
> Sem `LND_REST_URL` + `LND_MACAROON_HEX`, o processo aborta imediatamente.

---

## Pré-requisitos

| Componente | Mínimo | Notas |
|---|---|---|
| Node.js | >= 22 | `fetch` nativo, sem polyfill |
| LND | v0.18+ | REST API + admin macaroon |
| Bitcoin Core | v27+ | Nó completo ou pruned |
| NOSTR relay | qualquer | Recomendado relay próprio |

---

## Opção A — Deploy Directo (VPS / bare metal)

### 1. Preparar ambiente

```bash
# Clonar e instalar
git clone https://github.com/seu-user/ET-COSMIC.git
cd ET-COSMIC
npm ci

# Copiar e preencher variáveis de produção
cp .env.production.example .env.production
vim .env.production
```

### 2. Preencher `.env.production`

```bash
# ── OBRIGATÓRIO ──
NODE_ENV=production
PORT=3001
LND_REST_URL=https://127.0.0.1:8080
LND_MACAROON_HEX=<hex do admin.macaroon>
VITE_NOSTR_RELAY_PRIMARY=wss://relay.seudominio.example
VITE_BITCOIN_NETWORK=mainnet

# ── ROYALTIES (recomendado) ──
VITE_ETRNET_TREASURY_NPUB=npub1...
VITE_PROTOCOL_ROYALTY_BPS=10

# ── NWC (pagamentos frontend) ──
VITE_NWC_SECRET=nostr+walletconnect://...
```

### 3. Verificar pré-voo

```bash
npm run production:preflight
```

### 4. GhostDocker / Harmonia (opcional mas recomendado)

```bash
npm run build:vps          # void-runner + pi_worker.wasm
npm run quantum:dev        # motor CQR :8472 (terminal separado)
npm run production:harmony # POST /cosmic/void/harmony — valida void-runner
```

No browser, **HiggsGit** e **PhantomPipeline** correm em TypeScript (`cosmicVoidOrchestrator.ts`). Com CQR online, `runGhostSandbox()` usa **GhostDocker Rust**; offline, fallback **GhostDock TS**.

### 5. Build + Deploy

```bash
# Build do frontend (injeta VITE_* no bundle)
source .env.production
npm run build

# Iniciar servidor de produção
NODE_ENV=production node server/server.js
```

O servidor serve:
- `dist/` → PWA frontend estático
- `/api/aqre/*` → Motor AQRE (emulador clássico)
- `/api/lusus/*` → Motor LUSUS (simulações físicas)
- `/api/lightning/*` → Pagamentos Lightning (LND real)
- `/api/pqc/*` → Criptografia pós-quântica
- `/health` → Healthcheck

### 6. Systemd (opcional)

```ini
[Unit]
Description=ETRNET Server
After=network.target lnd.service

[Service]
Type=simple
User=etrnet
WorkingDirectory=/opt/ET-COSMIC
EnvironmentFile=/opt/ET-COSMIC/.env.production
ExecStart=/usr/bin/node server/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

---

## Opção B — Docker Compose (stack completa)

### 1. Preparar

```bash
cp .env.sovereign.example .env.sovereign
vim .env.sovereign
```

### 2. Subir infraestrutura

```bash
# Bitcoin + LND + RTL + NOSTR relay
docker compose --env-file .env.sovereign \
  -f docker-compose.sovereign.yml up -d bitcoind lnd rtl nostr-relay

# Criar carteira LND (primeiro uso)
docker exec -it lnd lncli --network=regtest create

# Obter macaroon
npm run lnd:macaroon
# → colar em LND_MACAROON_HEX= no .env.sovereign
```

### 3. Motor quântico + HTTPS (VPS — usar longe no telemóvel)

```bash
npm run stack:up:harmony
```

URL no APK ou painel Harmonia: `https://<IP-VPS>:9443` (certificado Caddy `tls internal`).

### 4. Motor quântico + GhostDocker (Harmonia local)

```bash
# Binários Rust no host (npm run production:quantum:prepare) — imagem só Python
npm run stack:up:harmony

curl -s http://127.0.0.1:8472/health
curl -s http://127.0.0.1:8472/cosmic/void/runner/status | head -c 200
```

**Build falha com `Temporary failure in name resolution` (pip/apt)?**  
`npm run production:quantum:prepare` instala as deps Python **no host** e copia o venv para a imagem — o `docker build` não precisa de internet. Se o host não tiver Python 3.12, o prepare usa `docker run --network=host` uma vez.

Alternativa sem container: `npm run quantum:lan:restart` (CQR na porta 8472 do host).

### 5. Subir servidor + frontend

```bash
# VITE_QUANTUM_API_URL=same-origin no .env.sovereign → nginx faz proxy /cosmic e /pmu
docker compose --env-file .env.sovereign \
  -f docker-compose.sovereign.yml \
  --profile quantum --profile server --profile frontend up -d --build
```

### 6. Verificar

```bash
npm run stack:status
curl http://localhost:3001/health
curl http://localhost:8080
npm run production:harmony   # ciclo CGF→…→GhostDocker→Higgs→Phantom (requer CQR :8472)
```

---

## Opção C — Docker standalone (só PWA + server)

```bash
# Build da imagem de produção
docker build -f Dockerfile.production \
  --build-arg VITE_NOSTR_RELAY_PRIMARY=wss://relay.example.com \
  --build-arg VITE_ETRNET_TREASURY_NPUB=npub1... \
  --build-arg VITE_BITCOIN_NETWORK=mainnet \
  -t etrnet-production .

# Executar
docker run -d --name etrnet \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e LND_REST_URL=https://host.docker.internal:8080 \
  -e LND_MACAROON_HEX=<hex> \
  -e LND_TLS_SKIP=true \
  etrnet-production
```

---

## O que é Produção vs Laboratório

| Módulo | Estado | Notas |
|---|---|---|
| GhostID (PQC) | **Produção** | ML-KEM-1024 + ML-DSA-87 reais |
| Lightning (LND) | **Produção** | Pagamentos reais com nó próprio |
| NWC (NIP-47) | **Produção** | Nostr Wallet Connect real |
| Consent Framework | **Produção** | Ética + consentimento |
| DAO Governance | **Produção** | Smart contracts on-chain |
| AQRE | **Produção** | Emulador clássico (declarado) |
| LUSUS | **Produção** | Simulações físicas reais (declarado) |
| GhostDocker (void-runner) | **Produção*** | *Requer CQR :8472 + `build:vps` ou imagem `Dockerfile.quantum` |
| Harmonia (Higgs + Phantom) | **Produção*** | *Browser: TS sempre; Rust se CQR online |
| Heptary | Laboratório | Sistema numérico experimental |
| QRNG (IBM) | Laboratório | Requer API key IBM |
| Mining (Homotopy) | Simulado | Prova de conceito |
| Collapse Finance | Simulado | Instrumentos financeiros experimentais |
| QR Stocks | Simulado | Mercado simulado |

---

## Checklist Final

- [ ] `.env.production` preenchido (nunca commitado)
- [ ] `npm run production:preflight` passa
- [ ] `npm run build` sem erros
- [ ] LND acessível e sincronizado
- [ ] NOSTR relay operacional
- [ ] `VITE_ETRNET_TREASURY_NPUB` configurado (se royalties desejados)
- [ ] `server/db-apikeys.json` não está no git
- [ ] `quantum-engine` ou `npm run quantum:dev` se usar GhostDocker Rust
- [ ] `npm run production:harmony` passa (void-runner disponível)
- [ ] Firewall permite portas 3001 (server), 8472 (CQR), 9735 (LND P2P), 7777 (NOSTR)

---

## Checklist Real+ (5 passos)

Ordem recomendada para módulos **Real+** (rede, LND, CQR, hardware):

| Passo | Comando | O que valida |
|-------|---------|----------------|
| 1 | `npm run production:preflight:sovereign` | `.env.sovereign`, variáveis NWC/relay/CQR |
| 2 | `npm run stack:up` ou `stack:up:full` | Bitcoin, LND, RTL, NOSTR (+ CQR no `full`) |
| 3 | `npm run stack:up:harmony` | Motor CQR :8472 + void-runner (Harmonia Rust) |
| 4 | `npm run mesh:preflight` | APIs Web Bluetooth / serial (telemóvel) |
| 5 | `npm run android:build:release:sovereign` | APK Perfil A com CQR no dispositivo |

Verificação agregada:

```bash
npm run production:realplus   # executa os 5 passos acima (relatório único)
npm run production:harmony    # ciclo CGF → GhostDocker → Higgs → Phantom
```

Motores **Janus** e **Singularity (fase QRC)** usam entropia **Ω** (`loadOmegaMaterial`) para cartões virtuais e front-running MPS.

### Avisos comuns (corrigidos no repo)

| Aviso | Correção |
|-------|----------|
| `VITE_QUANTUM_API_URL ausente` | Definido em `.env.sovereign` e default em `scripts/load-env-sovereign.sh` (`http://127.0.0.1:8472`) |
| `nostr-relay unhealthy` | Healthcheck no compose usa `curl`/`wget`/TCP na porta 8080 — recrie: `bash scripts/docker-compose-sovereign.sh up -d nostr-relay` |
| `Docker Compose requires buildx` | Scripts `stack:*` usam `scripts/docker-compose-sovereign.sh` (fallback builder classic) |
| Mesh desligado | `VITE_ENABLE_NOSTR_MESH=true` em `.env.sovereign.example` e no teu `.env.sovereign` |

---

## Scripts de Produção

```bash
npm run production:realplus           # Checklist Real+ (5 passos)
npm run production:preflight          # Verificação completa
npm run production:preflight:strict   # Avisos = erros
npm run production:preflight:sovereign # Preflight da stack Docker
npm run production:deploy             # Preflight + build + instruções
npm run production:docker             # Build imagem Docker (PWA + server)
npm run production:quantum:prepare  # void-runner + pi_worker no host (evita rustup no Docker)
npm run production:quantum            # prepare + build imagem CQR
npm run production:harmony            # Teste Harmonia (GhostDocker → Higgs → Phantom)
npm run stack:up:harmony              # prepare + compose quantum-engine + cqr-gateway
npm run stack:quantum               # Sobe só quantum-engine no Compose
npm run stack:up                      # Bitcoin + LND + RTL + NOSTR
npm run stack:status                  # Estado dos containers
```
