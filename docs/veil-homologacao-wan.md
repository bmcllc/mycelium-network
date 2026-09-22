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
> `02a32e1` (ajustes de implantação P1.2), congelado como base deste ensaio.

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

Base congelada do ensaio: commit `02a32e1`
(`02a32e12fc1bb8f33a693defe33595e91ff02da9`). Implantar **exatamente** esta
revisão no cliente, Guard, Middle e Exit — sem patches locais:

```bash
git checkout 02a32e1
cargo build -p mycelium-node --features veil     # biblioteca do daemon
cargo build -p mycelium-cli --features veil      # binário `mycelium`
```

Em **cada** máquina, gravar `registro-<host>.txt` (nunca chaves privadas):

- `hostname`, horário UTC, interfaces e IPs efetivos;
- commit, SHA-256 do binário (`sha256sum target/debug/mycelium`) e versão;
- endereço anunciado (`--veil-advertise`) e identidade pública
  (`identity_pubkey` de `mycelium veil descriptor`);
- relógio sincronizado (TTL do descritor = 24 h; tolerância de drift = 5 min).

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

**Captura no cliente (A) sem filtro de porta.** Filtrar apenas `tcp port 9050`
não é suficiente para provar a ausência de conexões diretas em outras portas:
uma eventual tentativa A→Middle/Exit/destino em porta arbitrária passaria
despercebida. Registre **todo** o tráfego de A:

```bash
sudo tcpdump -ni any -w cliente_completo.pcap   # em A: captura SEM filtro
```

Análise em A (com o fluxo da seção 2.2 ativo), usando os IPs dos nós:

```bash
# Esperado: somente conexões com o Guard (B)
tcpdump -nr cliente_completo.pcap 'dst host <IP_PUBLICO_B>'
# Esperado: ZERO pacotes — direto para Middle/Exit/destino em qualquer porta
tcpdump -nr cliente_completo.pcap 'dst host <IP_PUBLICO_C> or dst host <IP_PUBLICO_D> or dst host <IP_DEST_E>'
```

No Guard (B), captura complementar:

```bash
sudo tcpdump -ni any -w guard_entrada.pcap   # em B
```

- Em B: as conexões de entrada vêm de `<IP_PUBLICO_A>` (o IP real do cliente,
  já que ele se conecta diretamente ao Guard — a primeira conexão é sempre
  direta por construção; o que não pode existir é conexão do cliente a
  Middle/Exit).
- **Negativo obrigatório**: em C e D, nenhum pacote com origem `IP_PUBLICO_A`.

> `cliente_completo.pcap` também serve aos negativos das seções 2.3 e 2.5:
> a mesma base prova que a queda do Middle não gera conexão direta e que não
> há resolução DNS direta no cliente.

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
   momento após a queda; em A, `cliente_completo.pcap` não deve conter pacote
   algum com destino `<IP_PUBLICO_D>`/`<IP_DEST_E>` depois do abort.

### 2.4 Reinício do relay preserva o pin

1. Pare o Guard (B) e reinicie com os **mesmos** argumentos.
2. Confirme no log: `identidade Veil carregada do disco` e o **mesmo**
   `identity_pubkey` de antes.
3. No cliente, reconecte (reinicie o `curl`) **sem alterar** `--veil-trust`.
4. A conexão deve funcionar — sem redistribuir pins.
5. Contra-prova documentada: girar a identidade com `--veil-rotate-identity`
   **deve** quebrar os pins antigos até a redistribuição (rotação explícita).

### 2.5 DNS via Exit e política de destino — `DNS_AND_EXIT_POLICY`

```bash
sudo tcpdump -ni any 'udp port 53 or tcp port 53' -w cliente_dns.pcap   # em A
```

- O único `curl` usado é com `--socks5-hostname` (resolução **remota** pelo
  Exit). Nenhuma consulta DNS direta para `<DOMINIO_T>` pode partir de A;
  qualquer resolução local (DNS/DoH da máquina A) reprova a evidência.
  `ATYP=0x03` isoladamente não prova ausência de vazamentos.
- No Exit, testar destinos proibidos pela exit policy (padrão: RFC 1918,
  loopback, CGNAT e SMTP 25/465/587): devem ser rejeitados **antes** de
  qualquer conexão de egresso — erro no cliente e nenhum pacote no pcap de E.
- Não usar serviço de terceiros como oráculo único; o destino T é controlado
  pela equipe (log de IP/porta de origem).

### 2.6 Confidencialidade do transporte — `TRANSPORT_CONFIDENTIALITY`

- Nas capturas dos enlaces (A↔B, B↔C, C↔D), nenhuma amostra pode conter
  plaintext de aplicação: sem URL, sem `Host:` HTTP, sem caminho e sem
  metadados de rota completos. `strings` nos pcaps deve revelar apenas
  células fixas de 512 bytes e ciphertext do handshake KEM.
- Fazer um `curl --socks5-hostname http://<DOMINIO_T>/` com marcador
  identificável na resposta e confirmar que o marcador **não** aparece em
  nenhum pcap de enlace — apenas dentro das células cifradas.
- **Ressalva registrada**: células de tamanho fixo não são proteção absoluta
  contra análise temporal de tamanho/ritmo; anotar essa limitação no relatório.

## 3. Critérios de aceite — cinco evidências de campo

Cada evidência abaixo é reportada com **PASS/FAIL**, identificação das
máquinas (`hostname`, IPs efetivos, SHA-256 do binário) e arquivos de captura
ou logs **sanitizados** anexados. **Não atribuir PASS por antecipação**: o
resultado só existe após o relatório assinado e as capturas anexadas.

| Evidência | Critério | Arquivos |
|-----------|----------|----------|
| `WAN_PHYSICAL` | Cadeia C→G→M→E→T em redes distintas; T observa IP público do Exit (nunca do cliente) | `cliente_completo.pcap`, `guard_entrada.pcap`, pcaps de C/D, `destino_exit.pcap`, `whoami` de T, `registro-*.txt` |
| `FAIL_CLOSED` | Queda de G/M sem conexão direta C→T; descritor adulterado / pin errado / TTL expirado / relógio fora da tolerância / endpoint inatingível rejeitados antes de expor dados | pcaps de A e E pós-abort; logs de rejeição no cliente |
| `IDENTITY_RESTART` | Mesmo `identity_pubkey`/KEM após reinício; pin continua válido; rotação apenas com `--veil-rotate-identity` | log de B na 2ª vida, reconexão sem novos pins, contra-prova de rotação |
| `DNS_AND_EXIT_POLICY` | Sem resolução direta em A; destinos proibidos rejeitados antes da conexão | `cliente_dns.pcap`, log do Exit, erro no cliente |
| `TRANSPORT_CONFIDENTIALITY` | Nenhum plaintext HTTP/URL/metadados de rota nos enlaces (ressalva de análise temporal) | `strings` dos pcaps, marcador identificável ausente |

## 4. Pós-homologação

Com estas evidências registradas, o P1.2 em campo fica encerrado e o P1.3 fica
habilitado: bridges e transportes de entrada intercambiáveis, com switching
entre **duas bridges independentes** sem fallback direto ao destino —
preservando a semântica do circuito LIVE (células onion, pins GhostId, QEL).
A interface de transporte de entrada será definida como `EntryTransport` no
crate `mycelium-veil` (módulo `bridge`), com `DirectEntry` (TCP direto ao
Guard) e `BridgeEntry` (conexão através de nó bridge independente); o pool de
entradas tenta a bridge primária e, diante de bloqueio, alterna para a
secundária — e, se **todas** falharem, o circuito falha fechado: nenhuma
tentativa de conexão direta ao destino.