# 🍄 Mycelium Network — O Substrato Vivo do The Lattice

> *"A floresta não é uma coleção de árvores. É uma rede subterrânea de fungos que alimenta, comunica e cura."*

Nuvem P2P viva em Rust: hifas (libp2p), feromônios, Spore Bank, e o fluxo Lattice ponta a ponta.

## Quick start

```bash
# 1. Planta a semente (identidade + recursos em disco)
cargo run -p mycelium-cli --release -- --home /tmp/node-a sprout --contribute 2cpu,4gb,100gb

# 2. Desperta o daemon (Event Horizon HTTP em :7474)
cargo run -p mycelium-cli --release -- --home /tmp/node-a daemon --contribute 2cpu,4gb,100gb --horizon-port 7474

# 3. Noutro terminal — fluxo Lattice → Chamber viva
cargo run -p mycelium-cli --release -- --home /tmp/node-a sow --message "hello"
# anote o ContentId (Qm…)
cargo run -p mycelium-cli --release -- --home /tmp/node-a signal --plot Qm… --quorum 1 --ion webapp

# 4. Acesse o Ion pelo Singularity (proxy HTTP real)
curl -s http://127.0.0.1:7474/webapp/ | jq .
```

Demo automatizada do horizon: `./scripts/horizon-demo.sh`

Dois nós com bootstrap remoto:

```bash
# terminal A — seed na porta 4001
mycelium --home /tmp/a daemon --listen /ip4/0.0.0.0/tcp/4001

# terminal B
mycelium --home /tmp/b daemon --bootstrap /ip4/IP_DE_A/tcp/4001/p2p/PEERID_DE_A
```

Bootstrap além da LAN (catálogo HTTP + `/dnsaddr/`):

```bash
mycelium seeds fetch --url ./seeds/mainnet.example.txt
mycelium daemon --public-bootstrap --bootstrap-url https://seu.host/seeds.txt
# ou arquivo local:
mycelium daemon --seed-file ./seeds/mainnet.example.txt --listen /ip4/0.0.0.0/tcp/4001
```

Vacuum usa **bubblewrap** por padrão quando `bwrap` está no PATH; layers content-addressed em `{home}/layers/` e limites soft de RAM (`RLIMIT_AS`).

Rede só com seed book (sem mDNS / sem `--bootstrap` manual):

```bash
./scripts/seedbook-demo.sh
```

Demos: `./scripts/e2e-demo.sh` · `./scripts/horizon-demo.sh` · `./scripts/seedbook-demo.sh` · `./scripts/isotope-decay-demo.sh`

## CLI unificada `lattice` (Forja + Rede)

```bash
# Fase 1 — planta um nó (folha CGNAT por default; --sporocarp exige gate de prova)
./lattice plant

# Comando mágico: B.A.S.E. analisa o binário → Plot → Ion no Event Horizon
./lattice resurrect caminho/para/firmware.bin
# → http://127.0.0.1:7474/webapp/

# Passthrough: lattice base … (base-cli) e lattice daemon|sow|status… (mycelium-cli)
```

Requer binários compilados (`target/release/mycelium` e `Behavioral ASIC Synthesis Engine/target/release/base`) ou `LATTICE_MYCELIUM_BIN` / `LATTICE_BASE_BIN`. Home default: `LATTICE_HOME` ou `~/.local/share/mycelium`.

## Código-fonte pela rede (sem git, sem GitHub)

```bash
# Semeia um diretório inteiro (recursivo) com visibilidade
mycelium --home ~/n1 seed-code --path ./meu-app --name meu-app \
  --description "app beta" --ion webapp --visibility public   # public|private|reserved|archived|community

# Em outro nó, baixa o código (replica via gossip/SporePrint em segundos)
mycelium --home ~/n2 recall-code --plot Qm…            # extrai em ./meu-app (CWD do CLI)
mycelium --home ~/n2 recall-code --plot Qm… --output /tmp/x   # destino explícito

# privado: só o autor baixa; o conteúdo nunca trafega na rede
```

## Fluxo ponta a ponta

```
Giggs sow Plot → Spore Bank (disco + DHT) → gossip hifas
       → TheField Signal + quórum
       → Inertia Vectors (build/test/deploy)
       → Vacuum Chamber → Plasma Ion → Singularity Event Horizon
```

## Comandos CLI

| Comando | Função |
|---|---|
| `sprout` | Inicializa identidade/recursos sem subir rede |
| `daemon` | Organismo persistente (Ctrl-C ou `shutdown`) |
| `status` | Estado vivo (socket) ou offline (disco) |
| `sow` | Semeia Plot → Spore Bank + gossip/DHT (`--qel`/`--nostr`/`--ghost`) |
| `signal` | Emite Signal de pipeline no TheField |
| `resonate` | Contribui para o quórum de um Signal |
| `recall` | Lê Plot local; DHT ou `--qel --nostr` (relays) |
| `bootstrap` | Dial explícito a um peer remoto |
| `seeds list/add/fetch` | Seed book (bootstrap público) |
| `seeds catalog list/add/remove/export` | Catálogo estruturado de seeds públicas/privadas (`{home}/seeds/catalog.json`) + export para mainnet.txt |
| `isotope-put` / `isotope-get` | Estado Isotope (anel 4 + Decay pelas hifas) |
| `deploy` | One-shot: sow → signal → URL do Event Horizon |
| `store list/caps/launch/publish` | App Store / Steam P2P de software antigo e emulação (QEMU, MAME, RetroArch, WASM) |
| `repo publish/clone/list` | Distribuição de código soberana: publica a árvore como Plot multi-leaf (DHT + gossip) e reconstrói em qualquer nó — sem GitHub |
| `shutdown` | Hiberna o daemon (estado fica em disco) |

## Crates

| Crate | Papel |
|---|---|
| `mycelium-core` | NodeId, ContentId, Resources, FruitingBody |
| `mycelium-hyphae` | libp2p QUIC/TCP, mDNS, Kademlia, gossip, métricas, bootstrap |
| `mycelium-pheromones` | Identidade ed25519 |
| `mycelium-nutrients` | Ledger ATP/Enzymes/Mycelia/Spores/Resilience |
| `mycelium-sporebank` | Plots em disco + chaves DHT |
| `mycelium-store` | App Store P2P, manifesto de software/ROM, motor de emulação QEMU/MAME/RetroArch |
| `mycelium-node` | Daemon, protocolo Lattice, socket de controle, ion `src` (browser de código soberano), ion `seeds` (catálogo público/privado) |
| `giggs` … `plasma` | Componentes do Lattice |
| `mycelium-cli` | Binário `mycelium` |

## Persistência (`MYCELIUM_HOME` / `--home`)

```
gland.seed          identidade (PeerId estável)
ledger.json         nutrientes
resources.json      contribuição
organism.json       field, ions, métricas de hifas, bootstrap
nucleus.json        Isotope (átomos LWW)
layers/             Vacuum layers content-addressed
builds/             workbench do Inertia
sporebank/plots/    Plots content-addressed
listen_addrs.json   multiaddrs para bootstrap de pares
seeds.txt           seed book mesclado
mycelium.sock       plano de controle do daemon
```

## CGNAT / Vivo sem esporocarpo: Hybrid Theory (Nostr + QEL + ipfs local)

Outbound `wss://` (porta 443) + blockstore local — funciona atrás de firewall residencial:

```bash
mycelium sow --message "floresta" --hybrid
# noutro home (cola o Qm… completo):
mycelium --home /tmp/folha-b recall --plot Qm… --hybrid
./scripts/hybrid-demo.sh
```

Docs: [docs/nostr-qel.md](docs/nostr-qel.md) · voluntário mesh: [docs/candidatos.md](docs/candidatos.md) · ET-COSMIC bridge: [docs/et-cosmic-bridge.md](docs/et-cosmic-bridge.md) · feature CLI `nostr` (default).

## COSMIC — storage + compute + identidade pós-quânticos

Remodela o tríplice *VPS = compute + storage + uptime* em **contratos
criptográficos**: a confiança sai do hardware e vai pra criptografia.
Design completo em [docs/cosmic-design.md](docs/cosmic-design.md). Binário
`cosmic` (crate `cosmic-cli`):

```bash
# Storage QEL: fragmenta em shards pós-quânticos (3/7), multicanal.
# --home <nó> distribui os shards na malha Mycelium via Isotope (qualquer peer recupera).
cosmic put arquivo.bin --k 3 --n 7 --home ~/node-a
cosmic get Qm0d70b7c78873aafe911f4b5f9313502f5d9a3eb47aac0cdf0817fd2a6fb72140 --out recuperado.bin --home ~/node-b

# Compute verificável: receita determinística → proof re-provável (re-provm).
# --home <nó> publica proof + input na rede; cosmic verify <proof_id> recupera e re-executa.
cosmic run --recipe blake3 input.bin --proof proof.json --home ~/node-a
cosmic verify Qm0d70b7c78873… --home ~/node-b --id Qm0d70b7c78873…   # ✓ re-provm confere

# Identidade portátil: o mesmo --seed deriva a mesma identidade em QUALQUER OS/arch
cosmic auth spawn --seed 00010203… (e depois cosmic auth sign/verify)
```

Shards e identidade em `~/.cosmic` (ou `$COSMIC_HOME`).


## Fase tropical / PQC (port ET-COSMIC)

```bash
cargo test -p mycelium-tropical -p mycelium-pqc -p mycelium-distancebridge
```

Crates: `mycelium-tropical` (Max-Plus), `mycelium-pqc` (ML-KEM-1024), `mycelium-distancebridge` (seleção de transportes).

## Publicar um esporocarpo voluntário (zero VPS)

```bash
# De telemóvel 5G:
./scripts/probe-sporocarp.sh IP_PUBLICO 4001 telemovel-5g > proof.json

# No peer voluntário (não no CPE Vivo):
./scripts/verify-sporocarp.sh 4001 proof.json
MYCELIUM_REACHABLE=1 ./scripts/run-public-seed.sh
./scripts/export-seed.sh ~/.local/share/mycelium-seed >> seeds/mainnet.txt
```

24/7: `sudo MYCELIUM_REACHABLE=1 ./scripts/install-seed.sh`  
Docs: [docs/engenharia-reversa-bloqueio.md](docs/engenharia-reversa-bloqueio.md) ·
[docs/volunteer-sporocarp.md](docs/volunteer-sporocarp.md) ·
[docs/rizomorphs.md](docs/rizomorphs.md)

## Desenvolvimento

```bash
cargo build --workspace
cargo test --workspace
./scripts/e2e-demo.sh
```

## Licença

**GNU Affero General Public License v3.0** — veja [LICENSE](LICENSE).

Copyleft forte com cláusula de rede: quem distribuir ou oferecer o Mycelium
como serviço pela rede é obrigado a publicar o código-fonte das modificações.
Fork para lucrar sem devolver o código viola a licença.

> *"O futuro da computação não é construir castelos de silício. É plantar florestas de código."*
