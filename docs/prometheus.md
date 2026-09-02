# Prometheus /metrics

## Endpoint

```
GET /metrics  →  text/plain; version=0.0.4
```

Disponível no Event Horizon (porta 7474 por default).

O rate-limit da fronteira é configurável por ambiente (default **120
req/min por IP**):

```bash
MYCELIUM_RATE_MAX=100000            # teto de requests por janela/IP
MYCELIUM_RATE_WINDOW_SECS=60        # tamanho da janela
```

Útil para benchmarks e carga sintética local (ex.: `scripts/scaling-demo.sh`).

## Métricas exportadas

| Métrica | Tipo | Descrição |
|---------|------|-----------|
| `mycelium_neighbors` | gauge | Número de vizinhos conectados |
| `mycelium_plots` | gauge | Plots no Spore Bank |
| `mycelium_signals` | gauge | Signals no TheField |
| `mycelium_ions` | gauge | Ions em órbita no Plasma |
| `mycelium_atp` | gauge | Saldo de ATP |
| `mycelium_enzymes` | gauge | Saldo de Enzymes |
| `mycelium_mycelia` | gauge | Saldo de Mycelia |
| `mycelium_spores` | gauge | Saldo de Spores |
| `mycelium_resilience` | gauge | Saldo de Resilience |
| `mycelium_anastomoses` | counter | Total de conexões formadas |
| `mycelium_messages_in` | counter | Mensagens gossip recebidas |
| `mycelium_messages_out` | counter | Mensagens gossip enviadas |
| `mycelium_isotope_atoms` | gauge | Átomos no Nucleus |
| `mycelium_membrane{membrane="..."}` | gauge | Membrana atual (label) |
| `mycelium_physarum_phase{phase="..."}` | gauge | Fase Physarum (label) |
| `mycelium_ion_charge{ion="..."}` | gauge | Carga do ion (-1 negativa, 0 neutra, 1 positiva) — Plasma reativo |
| `mycelium_ion_desired_replicas{ion="..."}` | gauge | Réplicas desejadas sob carga observada |
| `mycelium_ion_remote_replicas{ion="..."}` | gauge | Réplicas remotas vivas conhecidas (via IonReady) |

## Frequência

O snapshot é gerado a cada **30 segundos** pelo organismo e publicado no
`EventHorizon`, que o serve no endpoint `/metrics`.

## Exemplo de saída

```
# HELP mycelium_neighbors Número de vizinhos
# TYPE mycelium_neighbors gauge
mycelium_neighbors 3
# HELP mycelium_atp Saldo de ATP
# TYPE mycelium_atp gauge
mycelium_atp 42
# HELP mycelium_membrane Membrana atual
# TYPE mycelium_membrane gauge
mycelium_membrane{membrane="folha"} 1
```

## Integração com Prometheus

```yaml
scrape_configs:
  - job_name: 'mycelium'
    scrape_interval: 30s
    static_configs:
      - targets: ['127.0.0.1:7474']
        labels:
          group: 'substrato'
```

### Alertas (Alertmanager)

Regras prontas em [`deploy/prometheus/alerts.yml`](../deploy/prometheus/alerts.yml):
isolamento (`MyceliumSemVizinhos`), ATP esgotado, demanda de réplicas não
satisfeita (`MyceliumIonSemReplicas`), réplica perdida, exportador morto e
gossip congelado. Instale com:

```yaml
rule_files:
  - /etc/prometheus/alerts.yml   # copie deploy/prometheus/alerts.yml para cá
```

## Plasma reativo (auto-scaling)

O ciclo completo roda sem operador humano:

1. **Carga observada** — o rizomorfo conta cada request por ion
   (`EventHorizon::note_request`); a cada 45s o organismo drena a janela.
2. **Sense** — `Ion::sense(req/s)` ajusta a carga: 0 req/s → Negative,
   1–50 → Neutral, >50 → Positive (réplicas desejadas = 1 + n/50).
3. **Brotar** — carga positiva e réplicas < desejadas → broadcast `IonOffer`
   (cooldown de 120s). Peer com recursos ociosos responde `IonAccept`, recebe
   `IonMigrate` (Void + layers) automático e frutifica sua própria Chamber,
   anunciando `IonReady` (rota extra no Horizon, gravidade distribui).
4. **Recombinar** — três janelas seguidas de carga zero **e** uma réplica
   remota viva cobrindo → a Chamber local é recombinada (processo morto,
   rota removida). A última réplica viva nunca morre.

## Código

- **Snapshot:** `mycelium-node/src/organism.rs` → `metrics_tick` + `plasma_scale_tick`
- **Endpoint:** `singularity/src/proxy.rs` → rota `/metrics` + `note_request`
- **Armazenamento:** `singularity/src/lib.rs` → `EventHorizon.metrics` + `ion_requests`

## AlertManager + webhook do seed book (produção)

O exportador Prometheus (`/metrics`) é a metade de observação. A outra metade —
**ação corretiva descentralizada** — vem do AlertManager rebobinando o *seed book*:
um alerta de isolamento/exportador-morto faz o peer ser marcado como saudável
falho e descoberto novamente.

### Como funciona

1. **AlertManager** (via `deploy/prometheus/alertmanager.yml`) dispara um
   `WebhookHandler` POSTando para o Event Horizon de cada nó:
   `POST http://<nó>:7474/seedwebhook`.
2. **Horizon** (`singularity/src/proxy.rs → seedwebhook`) grava o payload como
   uma linha JSONL em `{home}/seeds.health.jsonl` (append-only). O receptor
   grava bytes brutos — não precisa carregar o state do seed book.
3. **Organismo** consome o feed a cada 30s (`seedwebhook_tick`) chamando
   `SeedBook::load_health_feed`, que casa o `instance` label do alerta
   (`1.2.3.4:4001`) com a multiaddr da seed (`/ip4/1.2.3.4/tcp/4001`) e
   chama `record_alert`/`clear_alert`:
   - `status: firing` → `health_failures += 1` (a seed acumula falhas).
   - `status: resolved` → `health_failures = 0` + `last_seen` renovado.
4. O `health_check` existente remove seeds com `>= 3` falhas consecutivas —
   agora o AlertManager acelera esse processo: um nó que cai de fato é
   **desconectado do seed book** sem intervenção humana.

### Arquivos

| Arquivo | Papel |
|--------|-------|
| `deploy/prometheus/alerts.yml` | Regras (7 alertas fisiológicos) |
| `deploy/prometheus/prometheus.yml` | Scrape dos `/metrics` dos nós |
| `deploy/prometheus/alertmanager.yml` | Receivers webhook → `/seedwebhook` |
| `deploy/prometheus/docker-compose.yml` | Stack: 5 nós + prometheus + alertmanager |
| `deploy/Dockerfile` | Build multi-stage do daemon |
| `singularity/src/proxy.rs` | Rota `POST /seedwebhook` |
| `mycelium-hyphae/src/seeds.rs` | `record_alert`/`clear_alert`/`ingest_alert_payload`/`load_health_feed` |

### Teste rápido

```bash
bash scripts/webhook-smoke.sh   # POST real de payload AlertManager → /seedwebhook
```

Valida: HTTP 200, `seeds.health.jsonl` criado com o alerta, e a match de
`instance` (`1.2.3.4:4001`) × multiaddr (`/ip4/1.2.3.4/tcp/4001`).
