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
