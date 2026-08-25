> **Documento secundário** · Apoio a [VOID-QRC — Plano Principal](../docs/obsidian/VOID-QRC-PLANO-INDUSTRIA.md) · **Fase 3** — Harmonia remota

# Usar Harmonia longe (4G / outra rede)

> **Nota:** Se segues **[FILOSOFIA-DEPLOY.md](./FILOSOFIA-DEPLOY.md)** (Perfil A + B, sem Perfil C), em 4G usa **APK soberano** (CQR no dispositivo). Este ficheiro descreve exposição pública/túnel — **fora** desse modelo.

Três formas de ter **GhostDocker Rust + Higgs + Phantom** fora de casa.

---

## 1. URL remota no APK (sem recompilar) — recomendado

1. Instala APK soberano: `npm run android:build:sovereign`
2. Em casa, expõe o CQR (ver §2 ou §3)
3. No telemóvel: **Harmonia Cósmica → Motor CQR remoto**
   - Cola `https://….trycloudflare.com` ou `https://cqr.teudominio.com`
   - **GUARDAR** → **TESTAR** → **HARMONIA COMPLETA**

Funciona em qualquer rede. A URL fica no `localStorage` do telemóvel.

---

## 2. Túnel rápido (PC em casa + Cloudflare)

Terminal 1 — motor na LAN:

```bash
npm run quantum:lan
npm run build:vps
```

Terminal 2 — túnel público:

```bash
npm run cqr:tunnel
# cloudflared → https://….trycloudflare.com
# ou localtunnel (npx) → https://….loca.lt  (a URL muda cada vez que reinicias o túnel)
```

> **Importante:** deixa `npm run cqr:tunnel` **aberto**. Se fechares, a URL deixa de funcionar.

Se `quantum:lan` disser “já online” mas só em 127.0.0.1:

```bash
npm run quantum:lan:restart
```

No telemóvel (ou outro PC): cola essa URL no painel Harmonia.

> O túnel fecha quando fechas o terminal. Para 24/7 use VPS (§3).

---

## 3. VPS fixo (produção)

No servidor:

```bash
docker build -f Dockerfile.quantum -t etrnet-quantum .
docker run -d --name cqr -p 8472:8472 \
  -v void_pool:/app/void_pool etrnet-quantum
```

Coloca **Caddy/nginx** com TLS na frente (`https://cqr.teudominio.com` → `:8472`).

Build APK com URL fixa:

```bash
npm run android:build:remote -- https://cqr.teudominio.com
```

Ou só a URL no painel (APK soberano).

---

## Alternativa: Tailscale

1. PC e telemóvel na mesma tailnet
2. `npm run quantum:lan` no PC
3. URL no painel: `http://100.x.x.x:8472` (IP Tailscale do PC)

Sem expor porta na Internet pública.

---

## Resumo

| Situação | O que fazer |
|----------|-------------|
| Só offline | APK soberano, sem URL |
| Casa → rua | Túnel `npm run cqr:tunnel` + URL no painel |
| Sempre longe | VPS + HTTPS + URL no painel ou `android:build:remote` |
