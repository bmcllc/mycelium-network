> **Documento secundário** · Apoio a [VOID-QRC — Plano Principal](../docs/obsidian/VOID-QRC-PLANO-INDUSTRIA.md) · **Fase 3** — Harmonia Android

# Android — Harmonia (GhostDocker / Higgs / Phantom)

> **Deploy filosófico:** **[FILOSOFIA-DEPLOY.md](./FILOSOFIA-DEPLOY.md)** — base **Perfil A** (soberano no telemóvel) + **Perfil B** opcional (LAN/tailnet). Sem VPS/túnel público.

## Usar longe (4G / outra cidade)

Fora do modelo A+B: ver **[ANDROID-REMOTE.md](./ANDROID-REMOTE.md)**. Com A+B, em 4G usa **CQR no dispositivo** (APK soberano), não túnel.

---

## Opção A — CQR no telemóvel (APK soberano)

`npm run android:build:sovereign` — motor **CQR-Device** embutido (`void-local-cqr://device`).

- Entropia: hardware Android (`VoidAnimus.getDeviceEntropy`) + CSPRNG
- GhostDock + Higgs + Phantom no WebView
- Painel mostra modo **CQR no dispositivo**
- Sem PC, sem URL remota

---

## Opção B — Independente (offline, legado)

Sem PC, sem Wi‑Fi, sem motor CQR remoto. Tudo no telemóvel:

```bash
npm run android:build:sovereign
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

- **GhostDock** (sandbox local)
- **HiggsGit** + **Phantom Pipeline** (TypeScript + WASM void_core)
- Entropia Ω via CSPRNG/paleocomputação local (rótulo honesto `simulated`)

Build: `VITE_COSMIC_SOVEREIGN=true` — não define `VITE_QUANTUM_API_URL`.

---

## Opção C — Com GhostDocker Rust (PC/VPS na rede)

O APK embute `VITE_QUANTUM_API_URL` no build. O telemóvel **não** usa `127.0.0.1` do PC.

## 1. Motor CQR acessível na rede

```bash
npm run quantum:stop
npm run quantum:lan          # escuta 0.0.0.0:8472
npm run build:vps            # void-runner (se ainda não tiver)
```

Descobre o IP do PC (ex. `192.168.1.42`):

```bash
ip -4 route get 1.1.1.1 | awk '{print $7}'
```

No telemóvel (browser ou Termux), testa: `http://192.168.1.42:8472/health`

## 2. Configurar build

```bash
cp .env.android.example .env.android
# Editar:
#   VITE_QUANTUM_API_URL=http://192.168.1.42:8472
#   VITE_NOSTR_RELAY_PRIMARY=ws://192.168.1.42:7777
# Ou auto IP:
#   ANDROID_CQR_LAN_AUTO=1
```

## 3. Compilar e instalar

```bash
npm run android:build:harmony
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 4. Na app

**Compute → Harmonia Cósmica → Executar ciclo**

- **GhostDocker Rust** — se `void-runner` OK no CQR
- **HiggsGit + Phantom** — sempre em TS no WebView

## Produção (VPS)

```bash
VITE_QUANTUM_API_URL=https://cqr.seudominio.example npm run android:build:harmony
```

Use HTTPS no VPS; cleartext no APK é só para dev LAN.
