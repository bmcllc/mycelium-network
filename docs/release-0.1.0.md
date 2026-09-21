# Mycelium Network 0.1.0 — primeira release pública

O Mycelium 0.1.0 é uma rede P2P experimental para publicar, descobrir e
executar conteúdo entre nós voluntários. Esta versão inaugura a interface de
linha de comando `mycelium`, o daemon persistente, o Spore Bank, a malha
libp2p e o Event Horizon HTTP.

## Escopo suportado

- rede P2P por TCP, QUIC, mDNS, Kademlia e Gossipsub;
- bootstrap por multiaddr, arquivo, DNS TXT ou catálogo HTTP;
- persistência local de identidade, recursos, Plots e layers;
- publicação/recall de Plots e `seed-code` público;
- pipeline `sow → signal → deploy`, Event Horizon, métricas Prometheus e
  operação de seed voluntário;
- caminhos de conectividade residencial via Nostr/QEL quando a feature padrão
  está habilitada.

## Limites desta versão

O software é experimental. Não o use para dados irrecuperáveis, segredos sem
backup independente, decisões de segurança críticas ou disponibilidade com
SLA. A rede não fornece anonimato, resistência a tráfego malicioso nem
isolamento perfeito de workloads. Exponha a porta do Event Horizon apenas por
um reverse proxy configurado e mantenha o host atualizado.

`seed-code --visibility private` limita a replicação no protocolo; não deve
ser tratado como um cofre criptográfico. Use criptografia ponta a ponta antes
de semear qualquer conteúdo sensível.

## Instalação e verificação

Requer Rust 1.88 ou mais recente.

```bash
cargo build --locked --release -p mycelium-cli
cargo test --locked --workspace
./target/release/mycelium --help
```

Para uma malha local, execute `./scripts/e2e-demo.sh`. Para uma validação de
cinco nós, use `./scripts/stress-test-5nodes.sh`. O teste prolongado é
`./scripts/stress-prolonged.sh 60 5`.

## Operação pública

Leia antes [ops-seed.md](ops-seed.md), [volunteer-sporocarp.md](volunteer-sporocarp.md)
e [protocol.md](protocol.md). Publique um seed apenas após a prova de
alcançabilidade descrita nesses documentos. O serviço systemd e a imagem
Docker são pontos de partida operacionais; revise portas, endereço anunciado,
limites de recursos e reverse proxy para o seu ambiente.

## Compatibilidade

O protocolo atual usa envelope `v:1`. Não há compromisso de compatibilidade
de protocolo entre versões pré-1.0; fixe a versão do binário na sua malha e
faça upgrade coordenado dos seeds.

## Licença

AGPL-3.0-or-later. Consulte [LICENSE](../LICENSE).
