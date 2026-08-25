> **Documento secundário** · Apoio a [[VOID-QRC-PLANO-INDUSTRIA]] · **Fase 4** — whitepaper comercial

# Whitepaper v2.0 (Obsidian)

Documento completo: [[../whitepaper-v2.0.md]]

## Links

- [[IMC-ARCHITECTURE]] — IMC camadas
- [[ISOSSUPRAMULACAO]] — filosofia
- [[INFRASTRUCTURE-MANIFEST]] — o que fica no build v2
- [[SKUS-500-600]] — motores legado servidor (mapeiam para 510–514)

## SKUs v2.0 (mesh + sensores)

| SKU | Nome |
|-----|------|
| VOID-510 | Sensor Entropy Mesh |
| VOID-511 | Ising Mesh Solver |
| VOID-512 | Acoustic Room Handshake |
| VOID-513 | Chaos-Bell Mesh Sync |
| VOID-514 | Thomas-Fermi Distributed |
| VOID-520 | Compute Marketplace |
| VOID-521 | Entropy-as-a-Service |
| VOID-522 | ZK Proof Aggregation |
| VOID-600 | Isossupramulated Core |

## Backup

Snapshot completo pré-pivot:

```bash
bash scripts/backup-pre-imc-v2.sh
# → archive/snapshot-full-YYYYMMDD/
```

Build activo:

```bash
VITE_IMC_V2=1 npm run dev
```
