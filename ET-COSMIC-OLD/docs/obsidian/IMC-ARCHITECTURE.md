> **Documento secundário** · Apoio a [[VOID-QRC-PLANO-INDUSTRIA]] · **Fase 1–2** — malha IMC + API

# IMC — Isossupramulated Mesh Computer

```mermaid
flowchart TB
  subgraph client [Nó browser / Android]
    S510[VOID-510 sensores]
    S512[VOID-512 Web Audio]
    S511[VOID-511 WASM Ising]
    S514[VOID-514 TF shard]
  end
  subgraph edge [Servidor opcional]
    API["/api/imc"]
    ISO[server/isossupra legado]
  end
  subgraph mesh [Malha]
    NOSTR[VOID-43 Nostr]
    RTC[WebRTC]
  end
  S510 --> API
  S512 --> API
  S511 --> NOSTR
  API --> VOID600[VOID-600 Core]
  VOID600 --> S520[VOID-520 Marketplace]
  VOID600 --> S521[VOID-521 EaaS]
  NOSTR --> VOID600
```

## API

| Método | Path |
|--------|------|
| GET | `/api/imc/health` |
| GET | `/api/imc/status` |
| POST | `/api/imc/entropy/mesh` |
| POST | `/api/imc/ising/submit` |
| POST | `/api/imc/acoustic/derive` |
| POST | `/api/imc/marketplace/job` |
| POST | `/api/imc/entropy/service` |

## Cliente

`src/imc/` — `collectSensorEntropy()`, `measureRoomImpulse()`, `imcClient.ts`

## Painel

`/compute/imc` — `IMCCorePanel.tsx`
