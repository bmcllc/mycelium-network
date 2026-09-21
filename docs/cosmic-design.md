# COSMIC — Compute + Storage pós-quânticos sobre o Mycelium

> Rede **de** substância, não rede **de** servidores. Troca o tríplice
> *VPS = compute confiável + storage + uptime* por **contratos criptográficos**
> que sobrevivem à destruição de qualquer hardware individual.

Princípio de ouro: **confiança sai do hardware e vai pra criptografia.**
Você não pede a um dono de máquina para "não olhar seu dado" — você
fragmenta com QEL (Shamir) e exige identidade GhostID + licença VOID-00
pós-quântica. Nenhum vértice isolado detém segredo ou autoridade suficiente.

Guia espelho conceptual: ET-COSMIC `void_core` · marcador vivo:
[`status.md`](status.md) Fase 9+.

---

## O framing correto

**Errado:** "a rede vira 1 VPS" → a rede não é 1 máquina, é **N máquinas
não-confiáveis que você não controla**.

**Certo:** a rede vira o **substrato**, e cada capacidade (storage, compute,
identidade) vira um **contrato criptográfico**. A métrica de confiança deixa
de ser "uptime de datacenter" e vira **redundância de shards** e **proof de
resultado**.

| Tríplice legado | Remodelagem COSMIC | Mecanismo existente |
|---|---|---|
| Storage = um disco confiável | **Shards pós-quânticos K/N** multicanal | `mycelium-qel::fragment` + `reconstruct` + `assign_hybrid_transports` |
| Compute = rodar numa VM | **Compute verificável** (recipe → proof) | `lattice build` (B.A.S.E. prova por SMT), Signal/Inertia |
| Identity = IP / SSH key / root | **GhostID portátil + VOID-00** | `mycelium-ghostid`, `mycelium-zkp::license` (ML-DSA-87) |
| Uptime = 1 máquina 24/7 | **K/N canais + transporte híbrido** | `TransportHint` (Nostr/Ipfs/RelayMesh/LoRa/Sms/Proximity) |
| Quota/billing | **Ledger de nutrientes** | `mycelium-nutrients::Ledger`, `isotope` |

---

## Camadas

```
┌───────────────────────────────────────────────────────────────┐
│ COSMIC · CONTRATO  (o “ser”)                                   │
│   GhostID (quem) · VOID-00 license (o que pode) · QEL (como)   │
└───────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────────┐
│ COSMIC · SEMÂNTICA  (o “quê” — a API)                          │
│   cosmic put/get   → QEL storage (shards pós-quânticos K/N)    │
│   cosmic run       → vértice executável + proof verificável    │
│   cosmic auth      → identidade portátil (qualquer os/arch)    │
└───────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌───────────────────────────────────────────────────────────────┐
│ SUBSTRATO Mycelium  (o “onde”)                                 │
│   DHT + gossipsub + RelayMesh + Nostr + LoRa/SMS/proximidade   │
│   transporte PQC (ML-KEM/ML-DSA) · qualquer os/arch             │
└───────────────────────────────────────────────────────────────┘
```

---

## 1 · `cosmic put` / `cosmic get` — Storage QEL

### Modelo de ameaça
Adversário pode comprometer **até `N-K` vértices** (dono que olha, máquina
confiscada, canal bisbilhotado) sem revelar o segredo. Grupos de `K` vértices
comprometidos reconstroem.

### Fluxo (usa `mycelium-qel` real)
1. **Cliente** com GhostID chama `QelConfig { threshold: K, total: N }`.
2. `fragment(data, config, seed)` → `Vec<QelShard>` (Shamir shares + blake3
   hash do conteúdo → `HashMismatch` protege integridade na reconstrução).
3. `assign_hybrid_transports(K, N)` → cada shard recebe um `TransportHint`
   (Nostr, Ipfs, RelayMesh, LoRa, Sms, Proximity) para **nenhum canal único**
   possuir a maioria.
4. Shards são publicados via `mycelium daemon isotope-put` / SporeBank com
   chave `cosmic/<content_id>/<i>`, assinados pelo GhostID do cliente.
5. **`get`**: o cliente pede por content_id; ao juntar `K` shards (dos `N`
   canais), `reconstruct(shards)` devolve os bytes e **verifica o hash**.

### Garantias
- **Integridade**: `reconstruct` retorna `HashMismatch` se qualquer shard foi
  corrompido/adulterado.
- **Confidencialidade pós-quântica**: Shamir não gasta tanta máquina quanto
  simetria, e a identidade de assinatura é ML-DSA-87 (FIPS 204) — não depende
  de RSA/ECDH que QCs partem.
- **Disponibilidade calculável**: `K/N` é o teu SLA. Sobrevive à perda de
  `N-K` shards/canais — uptime **cósmico**, não de datacenter.

---

## 2 · `cosmic run` — Compute verificável

### Modelo de ameaça
Um vértice pode **maliciosamente** (ou por falha) executar errado. Não basta
"rodou na minha VM".

### Fluxo
1. **Recipe** é um blob content-addressed: `(input_blob, flags, tool, salt)`
   — imutável, publicado na rede.
2. Qualquer vértice contribuidor executa e devolve `result` **assinado** com
   GhostID num `VectorOffer`/`MomentumReport` (Inertia) → converge no maior
   clock (Isotope/ledger).
3. **Proof de corretude**: B.A.S.E. (`lattice build`) já **prova contratos por
   SMT**. Para computação, o proof é um **re-provm** — segundo vértice
   independente re-executa o recipe e compara hash do result; cada result é
   content-addressed, então "este binário veio deste source+flags" é
   verificável a qualquer momento, sem confiar em quem executou.
4. Quota de execução debita no **ledger de nutrientes** do requisitante.

### Garantias
- **Correção independente do executor**: resultado é verificável por re-provm,
  não pela reputação de 1 VM.
- **Heterogeneidade de poder**: capacidade agrega de N máquinas de qualquer
  os/arch — é o "poder de computação" da rede.

---

## 3 · `cosmic auth` — Identidade portátil

### Modelo de ameaça
Trocar de máquina/OS não pode quebrar a identidade; e "a identidade" não pode
ser roubada por quem rouba 1 máquina.

### Fluxo
1. `EntropyCollector` (keystroke timing, gyro, touch pressure, system entropy)
   → `GhostId::spawn(ttl)` — identidade efêmera com TTL (`is_expired`).
2. Para portabilidade entre qualquer OS/arch: `GhostId::from_secret_bytes(seed,
   ttl)` — o **seed** é o "pendrive criptográfico": você o carrega num QR /
   célula / arquivo protegido; em qualquer Linux/Android/macOS/Windows/
   RISC-V/ARM/x86, `spawn` da mesma identidade (`nostr_pubkey_hex`, `peer_id_bytes`).
3. **VOID-00 device binding** (`mycelium-zkp::license::license_verify_handshake`)
   amarra a licença ML-DSA-87 ao `device_entropy` do aparelho atual + GhostID.
4. `verify_nostr_event` / `sign` autenticam cada ação.

### Garantias
- **Identidade ≠ host**: não é IP nem SSH key; sobrevive à troca de máquina.
- **"Qualquer OS/arch"**: a identidade é separada do runtime; portar = carregar
  seed + GhostID, não portar o SO.
- **Pós-quântico**: assinatura ML-DSA-87 + bearer GhostID TTL, não só ed25519.

---

## Por que isto "substitui VPS" (quando estiver pronto)

| Capacidade da VPS | COSMIC | Maturidade* |
|---|---|---|
| Storage durável | `put/get` QEL K/N multicanal | QEL ✅ · API ❌ |
| Compute num host | `run` com proof | B.A.S.E. 🟡 · recipe ❌ |
| Acesso de qualquer OS | `auth` GhostID+VOID-00 | GhostID/VOID ✅ · UX ❌ |
| Uptime/HA | redundância de shards + proof | parcial |

\* ✅ = primitiva existe e testada · 🟡 = proto · ❌ = falta a camada semântica.

> **Honestidade:** COSMIC **não** é uma VPS hoje. É o desenho em que confiança
> e disponibilidade são **criptográficas e distributivas**, não de datacenter.
> O caminho de utilização real começa pela camada de storage (`put/get`), a
> mais perto de pronto porque QEL já está implementado.

---

## Roteiro de implementação (ordem de ataque)

1. **`cosmic put/get`** (storage QEL) — cerca a crate `mycelium-qel` com uma
   CLI `cosmic` + endpoint no daemon; o primeiro caso utilizável (ex.: QA
   descendente de "dropbox pós-quântico").
2. **`cosmic run`** (compute verificável) — recipe content-addressed + re-provm.
3. **`cosmic auth`** (identidade portátil) — CLI para spawn/verificar GhostID
   + VOID-00 binding "qualquer OS".

Documento vivo: status/evolução em [`status.md`](status.md).
