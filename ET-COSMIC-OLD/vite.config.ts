// vite.config.ts
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import http from 'node:http';
import type { ClientRequest, IncomingMessage } from 'http';
import { resolveEnabledPathsFromSkuInput } from './src/b2b/skuManifest';
import { IMC_EXTENDED_PATHS, IMC_SLIM_PATHS } from './src/b2b/imcInfrastructure';
import { b2bPanelLoadersPlugin } from './scripts/vite-b2b-loaders';

/** Descobre porta do ET-RNET Server (3001, 3003, ou ETRNET_SERVER_PORT do .env). */
function probeEtrnetPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function resolveEtrnetPort(envPort?: string): Promise<string> {
  const candidates = [...new Set([envPort, '3001', '3003'].filter(Boolean))] as string[];
  for (const p of candidates) {
    if (await probeEtrnetPort(Number(p))) {
      if (p !== envPort) {
        console.warn(
          `[vite] ETRNET_SERVER_PORT=${envPort ?? '?'} indisponível; proxy em http://127.0.0.1:${p}`,
        );
      } else {
        console.log(`[vite] ET-RNET proxy → http://127.0.0.1:${p}`);
      }
      return p;
    }
  }
  const fallback = envPort || '3001';
  console.warn(
    `[vite] ET-RNET offline em ${candidates.join(', ')}. Inicie: npm run server (proxy tentará :${fallback})`,
  );
  return fallback;
}

/** Rotas FastAPI em 8472 — não confundir com painéis SPA (/quantum/lsc, /quantum/aqre, …). */
const QUANTUM_API_PATH =
  /^\/quantum\/(entropy|chsh|bell|pachner|bb84|spin|switch|theorems|heptary\/simulate)(\/|$)/;

/** Painéis React em /quantum/<slug> — não enviar ao FastAPI (8472). */
function isQuantumPanelPath(url: string) {
  return /^\/quantum\/[a-z][\w-]*$/.test(url);
}

function quantumDevProxyBypass(req: { url?: string; method?: string }) {
  const url = (req.url ?? '').split('?')[0];
  if (QUANTUM_API_PATH.test(url)) return undefined;
  if ((req.method === 'GET' || req.method === 'HEAD') && isQuantumPanelPath(url)) {
    return '/index.html';
  }
  return undefined;
}

/** COEP exige CORP nas respostas do proxy — senão o browser bloqueia. */
function withCorp(
  proxy: ProxyOptions,
  onProxyReq?: (req: ClientRequest) => void,
): ProxyOptions {
  const userConfigure = proxy.configure;
  return {
    ...proxy,
    configure: (server, options) => {
      userConfigure?.(server, options);
      if (onProxyReq) {
        server.on('proxyReq', onProxyReq);
      }
      server.on('proxyRes', (proxyRes: IncomingMessage) => {
        const headers = proxyRes.headers as Record<string, string | string[] | undefined>;
        headers['cross-origin-resource-policy'] = 'cross-origin';
      });
    },
  };
}

export default defineConfig(async ({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isPagesShell = mode === 'pages';
  const etrnetPort =
    command === 'serve' ? await resolveEtrnetPort(env.ETRNET_SERVER_PORT) : env.ETRNET_SERVER_PORT || '3001';
  const etrnetTarget = `http://127.0.0.1:${etrnetPort}`;
  const lndMacaroon = env.VITE_LND_MACAROON_HEX ?? '';
  /** COEP quebra HMR WebSocket no Firefox; ative só se precisar de crossOriginIsolated em dev. */
  const devCoep = command === 'serve' && env.VITE_DEV_COEP === 'true';

  const b2bSkuList = (env.VITE_B2B_SKUS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!isPagesShell && b2bSkuList.length > 0) {
    console.log(`[vite] B2B SKUs (${b2bSkuList.length}): ${b2bSkuList.join(', ')}`);
  }

  const imcV2 = !isPagesShell && (env.VITE_IMC_V2 === 'true' || env.VITE_IMC_V2 === '1');
  const imcSlim = isPagesShell || env.VITE_IMC_SLIM === 'true' || env.VITE_IMC_SLIM === '1';
  const imcPaths = imcSlim ? IMC_SLIM_PATHS : IMC_EXTENDED_PATHS;
  const b2bEnabledPaths = isPagesShell
    ? new Set<string>()
    : imcV2
      ? new Set(imcPaths)
      : resolveEnabledPathsFromSkuInput(b2bSkuList);
  if (isPagesShell) {
    console.log('[vite] Pages shell — entry index.pages.html (sem IMC legado)');
  } else if (imcV2) {
    console.log(`[vite] IMC v2.0 (${imcSlim ? 'slim' : 'extended'}, ${imcPaths.length} rotas)`);
  }
  const b2bSingleEntry =
    b2bEnabledPaths?.size === 1 ? [...b2bEnabledPaths][0] : '';
  if (!isPagesShell && b2bEnabledPaths) {
    console.log(`[vite] B2B rotas (${b2bEnabledPaths.size}): ${[...b2bEnabledPaths].join(', ')}`);
    if (b2bSingleEntry) {
      console.log(`[vite] B2B shell slim → redirect / → ${b2bSingleEntry}`);
    }
  }

  const appPlugins = isPagesShell
    ? [react(), tailwindcss()]
    : [react(), tailwindcss(), b2bPanelLoadersPlugin(b2bEnabledPaths)];

  return {
    appType: 'spa',
    base: env.VITE_PAGES_BASE || '/',
    plugins: appPlugins,

    define: isPagesShell
      ? {
          __B2B_SKUS__: JSON.stringify([]),
          __B2B_SLIM_SHELL__: JSON.stringify(false),
          __B2B_SINGLE_ENTRY__: JSON.stringify(''),
          __IMC_V2__: JSON.stringify(false),
          __IMC_SLIM__: JSON.stringify(true),
        }
      : {
          __B2B_SKUS__: JSON.stringify(b2bSkuList),
          __B2B_SLIM_SHELL__: JSON.stringify(b2bEnabledPaths !== null),
          __B2B_SINGLE_ENTRY__: JSON.stringify(b2bSingleEntry),
          __IMC_V2__: JSON.stringify(imcV2),
          __IMC_SLIM__: JSON.stringify(imcSlim),
        },

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@crypto': resolve(__dirname, 'src/crypto'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@components': resolve(__dirname, 'src/components'),
      },
    },

    build: {
      target: ['es2022', 'firefox103', 'chrome105', 'safari16.4'],
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        input: isPagesShell ? resolve(__dirname, 'index.pages.html') : undefined,
        output: isPagesShell
          ? undefined
          : {
              manualChunks: {
                'vendor-react': ['react', 'react-dom'],
                'vendor-crypto': ['@noble/hashes', '@noble/curves'],
              },
            },
      },
    },

    server: {
      port: 5173,
      strictPort: false,
      // HMR usa a mesma porta do servidor (evita tela preta quando cai em :5174)
      ...(devCoep
        ? {
            headers: {
              'Cross-Origin-Opener-Policy': 'same-origin',
              'Cross-Origin-Embedder-Policy': 'require-corp',
            },
          }
        : {}),
      proxy: {
        '/api/aqre': withCorp({
          target: etrnetTarget,
          changeOrigin: true,
        }),
        '/api/lusus': withCorp({
          target: etrnetTarget,
          changeOrigin: true,
        }),
        '/api/imc': withCorp({
          target: etrnetTarget,
          changeOrigin: true,
        }),
        '/api/eternet': withCorp({
          target: etrnetTarget,
          changeOrigin: true,
        }),
        '/api/lightning': withCorp({
          target: etrnetTarget,
          changeOrigin: true,
        }),
        '/api/economy': withCorp({
          target: etrnetTarget,
          changeOrigin: true,
        }),
        '/api/mesh': withCorp({
          target: etrnetTarget,
          changeOrigin: true,
        }),
        '/quantum': withCorp({
          target: 'http://127.0.0.1:8472',
          changeOrigin: true,
          bypass: quantumDevProxyBypass,
        }),
        '/pmu': withCorp({
          target: 'http://127.0.0.1:8472',
          changeOrigin: true,
        }),
        '/cosmic': withCorp({
          target: 'http://127.0.0.1:8472',
          changeOrigin: true,
        }),
        '/qrng-anu': withCorp({
          target: 'https://qrng.anu.edu.au',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/qrng-anu/, ''),
        }),
        '/__dev/quantum-health': withCorp({
          target: 'http://127.0.0.1:8472',
          changeOrigin: true,
          rewrite: () => '/health',
        }),
        '/__dev/nostr-health': withCorp({
          target: 'http://127.0.0.1:7777',
          changeOrigin: true,
        }),
        '/__dev/lnd-health': withCorp(
          {
            target: 'https://127.0.0.1:8180',
            changeOrigin: true,
            secure: false,
            rewrite: () => '/v1/getinfo',
          },
          (proxyReq) => {
            if (lndMacaroon) {
              proxyReq.setHeader('Grpc-Metadata-macaroon', lndMacaroon);
            }
          },
        ),
      },
    },
  };
});
