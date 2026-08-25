# Registo de Riscos — ET-COSMIC / ETERNET

> **Documento secundário** · Apoio a [[obsidian/VOID-QRC-PLANO-INDUSTRIA.md]] · Matriz consolidada (38 riscos)  
> **Actualização:** 2026-05-23 · Release `v2.0.0-sovereign`

Fonte: análise cruzada Master SKU List + Whitepaper + código.  
Legenda estado: **Aberto** · **Mitigado** · **Aceite** · **Descartado**

---

## 1. Segurança criptográfica (8)

| ID | Risco | Gravidade | Estado v2.0 | Mitigação / nota |
|----|-------|-----------|-------------|------------------|
| S-01 | Gerador H simplificado (`H = G`) em ZK | Alta | **Mitigado** | `void_core/src/lib.rs` — `get_h_generator()` hash-to-scalar ≠ G |
| S-02 | Sem auditoria formal de segurança | Crítica | **Aberto** | Whitepaper §9.3 explícito; requer auditor externo |
| S-03 | WASM sandbox sem SGX/SEV | Média | **Aceite** | Documentado; atestação HW fora de scope alpha |
| S-04 | API taxas centralizada + fallback estático | Média | **Aberto** | `paymentGateway.ts` CoinGecko + fallback |
| S-05 | Ed25519 de entropia ambiental fraca (headless) | Média | **Mitigado** | GhostID: Argon2id + fuzzy + audit log fonte |
| S-06 | Shamir K=2 N=3 — perda de 2 shares | Média | **Aceite** | Documentado; resiliência limitada by design |
| S-07 | Rotação identidade 30 min desincronizada | Baixa | **Descartado** | **Não implementado** — whitepaper corrigido; MAC 5s `ghostvpn.ts` |
| S-08 | Bulletproofs / curvas sem verificação formal | Média | **Aberto** | Crate Rust; auditoria pendente |

## 2. Rede e transporte (5)

| ID | Risco | Gravidade | Estado | Nota |
|----|-------|-----------|--------|------|
| N-01 | Relays Nostr censuram signaling | Média | **Aberto** | Multi-relay recomendado |
| N-02 | BLE/NFC/LoRa falham silenciosamente | Média | **Aceite** | Permissões + fallback documentados |
| N-03 | Áudio ultrassônico bloqueado | Baixa | **Aceite** | `acousticRoom.ts` — fallback mesh |
| N-04 | Sem Tor/I2P — IP exposto WebRTC | Média | **Aberto** | Cripto E2E ≠ anonimato rede |
| N-05 | WebRTC sem PFS explícito documentado | Média | **Aberto** | DTLS default; config não detalhada |

## 3. Sabor «Quântico» / CQR (4)

| ID | Risco | Gravidade | Estado | Nota |
|----|-------|-----------|--------|------|
| Q-01 | Não é hardware quântico real | Crítica | **Aceite** | [[obsidian/DEPRECACAO-QUANTUM.md]] — sabor «Quântico» |
| Q-02 | BB84 simulado ≠ QKD real | Alta | **Aceite** | `simulation: true` · `quantum_verified: false` |
| Q-03 | FastAPI :8472 sem HTTPS | Média | **Aberto** | Pesquisa local only |
| Q-04 | Dependência Python/quimb removida | Baixa | **Mitigado** | `core/` + `server/lusus/`; legado em archive |

## 4. Governança e licenciamento (6)

| ID | Risco | Gravidade | Estado | Nota |
|----|-------|-----------|--------|------|
| G-01 | Dual-license GPL + comercial ambíguo | Média | **Mitigado** | `DUAL-LICENSE.md` + `LICENCA-LIVRE.md` |
| G-02 | Royalty 10 bps configurável a zero | Baixa | **Aceite** | Transparente em `protocolRoyalty.ts` |
| G-03 | Tesouraria Nostr sem recuperação social | Média | **Aberto** | Operacional |
| G-04 | VOID-00 enforce opcional | Média | **Mitigado** | `license:setup` + `VITE_VOID_LICENSE_ENFORCE` |
| G-05 | Reserva IA sem detecção scraping | Baixa | **Aberto** | `AI-USE-RESERVATION.md` |
| G-06 | Fundação em formação | Baixa | **Aberto** | `NOTICE` / `CREDITS.md` |

## 5. SKUs e negócio (6)

| ID | Risco | Gravidade | Estado | Nota |
|----|-------|-----------|--------|------|
| B-01 | Bundles WHITE-LABEL incompatibilidade | Média | **Aberto** | `npm run b2b:list` + semver manual |
| B-02 | VOID-00/01 semver implícito | Média | **Aberto** | Tag `v2.0.0-sovereign` |
| B-03 | ScrapScanner ToS terceiros | Alta | **Aberto** | Risco legal operador |
| B-04 | AMP-GOVERNANCE GDPR/LGPD | Média | **Aberto** | Consent lattice |
| B-05 | Android MDM privacidade | Média | **Aberto** | Perfil corporativo |
| B-06 | Certificação sem auditor externo | Média | **Aberto** | Training SKUs |

## 6. Operação e deploy (5)

| ID | Risco | Gravidade | Estado | Nota |
|----|-------|-----------|--------|------|
| O-01 | COOP/COEP Safari SharedArrayBuffer | Média | **Aberto** | `vite.config.ts` devCoep opcional |
| O-02 | WASM 266KB rede lenta | Baixa | **Mitigado** | Lazy load + fallback |
| O-03 | Service Worker bateria mobile | Média | **Aberto** | ANIMUS background |
| O-04 | WebRTC sem STUN/TURN fallback | Média | **Aberto** | Mesh não estabelece |
| O-05 | void-runner VPS centralizado | Média | **Aceite** | Perfil B documentado |

## 7. Pesquisa / laboratório (4)

| ID | Risco | Gravidade | Estado | Nota |
|----|-------|-----------|--------|------|
| R-01 | Quantum Research Lab falsa segurança | Alta | **Mitigado** | Banner simulação + sabor «Quântico» |
| R-02 | Bruno Theory não peer-reviewed | Alta | **Aberto** | Motor real; teoria proprietária |
| R-03 | Animus IA overpromise | Baixa | **Aceite** | Filosofia, não LLM |
| R-04 | Crypto Testament perda permanente | Média | **Aceite** | Dead man's switch by design |

---

## Resumo

| Categoria | Total | Críticos abertos |
|-----------|-------|------------------|
| Segurança | 8 | 1 (S-02 auditoria) |
| Rede | 5 | 0 |
| Sabor «Quântico» | 4 | 0 (aceites honestos) |
| Governança | 6 | 0 |
| SKUs | 6 | 1 (B-03 scraping) |
| Operação | 5 | 0 |
| Pesquisa | 4 | 1 (R-02 teoria) |
| **Total** | **38** | **3 prioritários** |

### Prioridade P0 (pré-produção financeira real)

1. **S-02** — auditoria externa de segurança  
2. **S-08** — revisão implementação ZK/commitments  
3. **B-03** — política legal ScrapScanner  

Ver também: [[obsidian/DEPRECACAO-QUANTUM.md]] · [[obsidian/PLANO-UNIFICACAO.md]]
