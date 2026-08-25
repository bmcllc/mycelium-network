> **Documento secundário** · Apoio a [VOID-QRC — Plano Principal](../docs/obsidian/VOID-QRC-PLANO-INDUSTRIA.md) · **Fase 3** — PWA Android

# PWA no Android (alternativa ao APK)

Se o **APK Capacitor trava** e só recuperas com reinício/reinstalação, usa a **PWA** no Chrome — é o mesmo `dist/`, mas corre no motor do browser (sem WebView embutido).

## Vantagens vs APK

| | PWA (Chrome) | APK (Capacitor) |
|---|--------------|-----------------|
| Travamento WebView / menu long-press | Raro | Mais frequente |
| Atualizar app | Recarregar página / novo build na LAN | Reinstalar APK |
| BLE + Foreground Service (ANIMUS) | Não | Sim |
| Harmonia soberana (CQR local) | Sim (build `sovereign`) | Sim |

## Perfil A — PWA soberana na LAN (recomendado)

No PC (mesma Wi‑Fi que o telemóvel):

```bash
npm run pwa:serve:sovereign
```

No telemóvel (Chrome):

1. Abrir `http://<IP-do-PC>:4173` (ex. `http://192.168.1.42:4173`)
2. Menu ⋮ → **Adicionar ao ecrã inicial** / **Instalar app**
3. Abrir o ícone **VØID** — modo standalone (PWA)

Relay/NOSTR na LAN: em `.env.sovereign` usa `ws://<IP-do-PC>:7777` e rebuild, ou serve também o stack Docker.

## Se travar na PWA

1. Fechar o ícone da PWA (não só minimizar)
2. Reabrir — o motor liberta WebGPU ao ir para segundo plano
3. Em **Harmonia**, botão **REINICIAR MOTOR**
4. Último recurso: Chrome → Definições do site → **Limpar dados** (não precisa desinstalar APK)

## Perfil B — PWA com CQR no PC

```bash
npm run quantum:lan
# .env.android ou build com VITE_QUANTUM_API_URL=http://<IP>:8472
vite build --mode sovereign
vite preview --host 0.0.0.0
```

## O que não tens na PWA

- Plugin nativo `VoidAnimus` (entropia hardware Android via APK)
- WhatsApp/contacts Capacitor

Para isso mantém o APK; para **Harmonia + VOID + pagamentos NWC** a PWA costuma ser mais estável.
