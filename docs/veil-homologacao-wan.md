# Homologação WAN — VEIL Ω (P1.2 em campo)

Procedimento de homologação física para validar o circuito distribuído
`cliente → Guard → Middle → Exit` entre **máquinas e redes distintas**, com
descritores assinados e identidades persistentes. Os testes de loopback
(`127.0.0.2/3/4`) validam os caminhos de código; esta homologação valida a
separação real entre operadores, redes e a observabilidade de rede.

> Complementa o roteiro de validação de campo em
> `docs/VEIL_P12_WAN_FIELD_VALIDATION.md` (critérios `WAN_PHYSICAL`,
> `FAIL_CLOSED`, `IDENTITY_RESTART`, `DNS_AND_EXIT_POLICY`,
> `TRANSPORT_CONFIDENTIALITY`). Este documento detalha os comandos e as
> capturas; aquele fixa as evidências e os critérios de aprovação.
> Os bloqueadores apontados naquele documento foram corrigidos no commit
> `7475dc1` (ajustes de implantação P1.2).

> Antes de começar, confirme os ajustes de implantação:
> - `--veil-advertise` separado de `--veil-listen` (nunca anuncie `0.0.0.0`);
> - identidade persistente (`{home}/veil-identity.json`, permissões 0600);
> - rotação de identidade apenas explícita (`--veil-rotate-identity`);
> - egresso do Exit sem bind implícito (NAT reescreve o IP observado).

---

## 0. Topologia alvo

```
[Cli-A]  →  [Guard-B]  →  [Middle-C]  →  [Exit-D]  →  [Dest-E]
 rede X      rede Y        rede Z         rede W       rede V
```

Cada papel em uma **máquina física ou VM distinta** (ideal: redes/ASNs
diferentes). O destino E é um servidor HTTP simples mantido pela equipe.

## 1. Preparação

Em **cada** nó (Guard, Middle, Exit), construir com a feature veil:

```bash
cargo build -p mycelium-node --features veil
cargo build -p mycelium
```

### 1.1 Relay/Guard — máquina B

```bash
mycelium daemon --veil \
  --veil-role relay \
  --veil-listen 0.0.0.0:9050 \
  --veil-advertise <IP_PUBLICO_B>:9050
```

- O descritor assinado usará `<IP_PUBLICO_B>:9050` (não `0.0.0.0`).
- Na 1ª execução, o log avisa `nova identidade Veil persistida` e o pin será
  impresso; anote-o. Reinícios posteriores carregam a mesma identidade.
- Coletar o descritor:

```bash
mycelium veil descriptor > guard.json
```

> Em NAT com port-forwarding, `<IP_PUBLICO_B>` é o IP externo do roteador e o
> `9050/tcp` deve ser encaminhado para esta máquina.

### 1.2 Middle — máquina C

```bash
mycelium daemon --veil \
  --veil-role relay \
  --veil-listen 0.0.0.0:9050 \
  --veil-advertise <IP_PUBLICO_C>:9050
mycelium veil descriptor > middle.json
```

### 1.3 Exit — máquina D (com política anti-SSRF)

```bash
mycelium daemon --veil \
  --veil-role exit \
  --veil-listen 0.0.0.0:9051 \
  --veil-advertise <IP_PUBLICO_D>:9051
mycelium veil descriptor > exit.json
```

- **NAT**: não use `--veil-egress-bind` — a origem observada pelo destino será
  o IP público traduzido pelo NAT do Exit. Se a máquina D tem múltiplas
  interfaces públicas, aí sim use `--veil-egress-bind <ip_local>` e confirme
  por captura qual IP o destino observa.

### 1.4 Cliente — máquina A

```bash
mycelium daemon --veil \
  --veil-role client \
  --veil-socks5 127.0.0.1:1080 \
  --veil-guard guard.json \
  --veil-middle middle.json \
  --veil-exit exit.json \
  --veil-trust guard:<HEX_IDENTITY_B> \
  --veil-trust middle:<HEX_IDENTITY_C> \
  --veil-trust exit:<HEX_IDENTITY_D>
```

> O modo produção exige **um pin por salto**, na ordem
> guard → middle → exit. Os HEX_IDENTITY são obtidos de cada máquina com
> `mycelium veil descriptor` (campo `identity_pubkey`).

## 2. Evidências por captura

### 2.1 Cliente fala APENAS com o Guard

No cliente (A) e no Guard (B):

```bash
sudo tcpdump -ni any 'tcp port 9050' -w cliente_guard.pcap   # em A
sudo tcpdump -ni any 'tcp port 9050' -w guard_entrada.pcap   # em B
```

- Em A: **todo** tráfego VEIL deve ter como destino `<IP_PUBLICO_B>:9050`.
- Em B: as conexões de entrada vêm de `<IP_PUBLICO_A>` (o IP real do cliente,
  já que ele se conecta diretamente ao Guard — a primeira conexão é sempre
  direta por construção; o que não pode existir é conexão do cliente a
  Middle/Exit).
- **Negativo obrigatório**: em C e D, nenhum pacote com origem `IP_PUBLICO_A`.

### 2.2 Destino observa o IP público do Exit

No destino (E):

```bash
sudo tcpdump -ni any 'tcp port 80' -w destino_exit.pcap
```

E um curl pelo circuito a partir do cliente:

```bash
curl --socks5-hostname 127.0.0.1:1080 http://<DEST_E>/whoami
```

- O servidor E deve responder com o **IP público do Exit (D)** — ou o IP
  público do NAT à frente de D — **nunca** o IP do Guard nem do cliente.
- `destino_exit.pcap` deve mostrar handshake TCP originado do IP de D.

### 2.3 Interrupção do circuito não provoca conexão direta

Com o SOCKS5 do cliente ativo:

1. Inicie um download/streaming contínuo (ex.: `curl` de um arquivo grande).
2. Aborte o processo do **Middle** (C) — `Ctrl+C` no daemon.
3. Observe o comportamento: a stream morre; **o cliente não deve abrir
   conexão direta com o destino** (nenhum pacote A→E fora do SOCKS5).
4. `destino_exit.pcap` não deve mostrar origem `IP_PUBLICO_A` em nenhum
   momento após a queda.

### 2.4 Reinício do relay preserva o pin

1. Pare o Guard (B) e reinicie com os **mesmos** argumentos.
2. Confirme no log: `identidade Veil carregada do disco` e o **mesmo**
   `identity_pubkey` de antes.
3. No cliente, reconecte (reinicie o `curl`) **sem alterar** `--veil-trust`.
4. A conexão deve funcionar — sem redistribuir pins.
5. Contra-prova documentada: girar a identidade com `--veil-rotate-identity`
   **deve** quebrar os pins antigos até a redistribuição (rotação explícita).

## 3. Critérios de aceite

| # | Critério | Evidência |
|---|----------|-----------|
| 1 | Descritor nunca contém `0.0.0.0` | `veil descriptor` em B/C/D |
| 2 | Cliente conecta só ao Guard | pcap A (destino = IP_B:9050) |
| 3 | Destino vê IP do Exit | resposta do whoami + pcap E |
| 4 | Sem fallback direto na queda | pcap E após abort do Middle |
| 5 | Reinício do relay preserva pin | log de B + reconexão sem novos pins |
| 6 | Rotação é explícita | `--veil-rotate-identity` muda o pin; reinício simples não |

## 4. Pós-homologação

Com estas evidências, o P1.3 (bridges e transportes intercambiáveis, com
switching entre duas bridges independentes sem fallback direto — preservando o
circuito LIVE e o QEL) pode ser iniciado.