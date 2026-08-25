##############################################################################
# ETΞRNET — Dockerfile de produção (PWA + WASM)
#
# Build:
#   docker build \
#     --build-arg VITE_NOSTR_RELAY_PRIMARY=wss://relay.example.com \
#     --build-arg VITE_QUANTUM_API_URL=https://quantum.example.com \
#     -t etrnet-frontend .
#
# Run:
#   docker run -p 8080:8080 etrnet-frontend
##############################################################################

# ── Stage 1: void_core WASM ───────────────────────────────────────────────────
FROM rust:1-bookworm AS wasm-builder

RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

WORKDIR /build
COPY void_core/Cargo.toml void_core/Cargo.lock* ./void_core/
COPY void_core/src ./void_core/src

WORKDIR /build/void_core
RUN wasm-pack build --target web --out-dir pkg

# ── Stage 2: Vite build ───────────────────────────────────────────────────────
FROM node:22-bookworm AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
COPY --from=wasm-builder /build/void_core/pkg ./void_core/pkg

# Vite injeta VITE_* no bundle (nunca colocar chaves privadas aqui)
ARG VITE_NOSTR_RELAY_PRIMARY=
ARG VITE_NOSTR_RELAY_FALLBACK=
ARG VITE_QUANTUM_API_URL=
ARG VITE_ETRNET_ANCHOR_ADDRESS=
ARG VITE_BITCOIN_NETWORK=regtest
ARG VITE_NWC_SECRET=
ARG VITE_LND_REST_URL=
ARG VITE_LND_MACAROON_HEX=
ARG QUANTUM_UPSTREAM=

ENV VITE_NOSTR_RELAY_PRIMARY=$VITE_NOSTR_RELAY_PRIMARY \
    VITE_NOSTR_RELAY_FALLBACK=$VITE_NOSTR_RELAY_FALLBACK \
    VITE_QUANTUM_API_URL=$VITE_QUANTUM_API_URL \
    VITE_ETRNET_ANCHOR_ADDRESS=$VITE_ETRNET_ANCHOR_ADDRESS \
    VITE_BITCOIN_NETWORK=$VITE_BITCOIN_NETWORK \
    VITE_NWC_SECRET=$VITE_NWC_SECRET \
    VITE_LND_REST_URL=$VITE_LND_REST_URL \
    VITE_LND_MACAROON_HEX=$VITE_LND_MACAROON_HEX

RUN npm run build

# ── Stage 3: Nginx ────────────────────────────────────────────────────────────
FROM nginx:alpine

ARG QUANTUM_UPSTREAM=

COPY --from=builder /app/dist /usr/share/nginx/html
COPY config/nginx-cqr-proxy.conf /tmp/nginx-cqr-proxy.conf

RUN CQR_PROXY="" && \
  if [ -n "$QUANTUM_UPSTREAM" ]; then \
    CQR_PROXY="$(sed "s|\${QUANTUM_UPSTREAM}|${QUANTUM_UPSTREAM}|g" /tmp/nginx-cqr-proxy.conf)"; \
  fi && \
  printf '%s\n' \
  'server {' \
  '    listen 8080;' \
  '    server_name _;' \
  '    root /usr/share/nginx/html;' \
  '    index index.html;' \
  '    gzip on;' \
  '    gzip_vary on;' \
  '    gzip_min_length 1024;' \
  '    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml application/wasm;' \
  "$CQR_PROXY" \
  '    location ~* \.(js|css|wasm|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {' \
  '        expires 1y;' \
  '        add_header Cache-Control "public, immutable";' \
  '    }' \
  '    location / {' \
  '        try_files $uri $uri/ /index.html;' \
  '    }' \
  '    add_header X-Frame-Options "SAMEORIGIN" always;' \
  '    add_header X-Content-Type-Options "nosniff" always;' \
  '    add_header Referrer-Policy "strict-origin-when-cross-origin" always;' \
  '}' \
  > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
