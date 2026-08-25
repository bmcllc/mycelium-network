#!/usr/bin/env node
/**
 * Build estático PWA — GitLab, GitHub, Cloudflare ou VPS/nginx.
 * GitLab/GitHub: shell produção (mode pages), sem IMC legado.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES_SHELL_ROUTES } from "./pages-shell-routes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

/** @typedef {"github-pages" | "cloudflare-pages" | "gitlab-pages"} StaticHost */

function projectSlug() {
  const raw =
    process.env.CI_PROJECT_NAME ||
    process.env.GITLAB_PROJECT_NAME ||
    process.env.GITHUB_REPOSITORY?.split("/")[1] ||
    "et-cosmic";
  return raw.toLowerCase();
}

function namespaceSlug() {
  return (
    process.env.CI_PROJECT_NAMESPACE_SLUG ||
    process.env.GITLAB_NAMESPACE ||
    process.env.GITHUB_REPOSITORY?.split("/")[0]?.toLowerCase() ||
    "namespace"
  );
}

/**
 * GitLab Pages: domínio único (`https://proj-123.gitlab.io/`) → base `/`;
 * group pages (`https://namespace.gitlab.io/project/`) → base `/project/`.
 * @see https://docs.gitlab.com/ee/user/project/pages/
 */
function gitlabPagesBase() {
  const pagesUrl = process.env.CI_PAGES_URL || process.env.GITLAB_PAGES_URL;
  if (pagesUrl) {
    try {
      const segment = new URL(pagesUrl).pathname.replace(/^\/+|\/+$/g, "");
      if (!segment) return "/";
      return `/${segment}/`;
    } catch {
      /* fallback abaixo */
    }
  }
  return `/${projectSlug()}/`;
}

function defaultBaseForHost(host) {
  if (host === "cloudflare-pages") return "/";
  if (host === "gitlab-pages") return gitlabPagesBase();
  return `/${projectSlug()}/`;
}

function hostLabelFor(host) {
  if (host === "cloudflare-pages") return "Cloudflare Pages";
  if (host === "gitlab-pages") return "GitLab Pages";
  return "GitHub Pages";
}

function canonicalUrl(host) {
  if (host === "cloudflare-pages") {
    const cfProject = process.env.CLOUDFLARE_PAGES_PROJECT || "et-cosmic";
    return process.env.CLOUDFLARE_PAGES_URL || `https://${cfProject}.pages.dev`;
  }
  if (host === "gitlab-pages") {
    return (
      process.env.CI_PAGES_URL ||
      process.env.GITLAB_PAGES_URL ||
      `https://${namespaceSlug()}.gitlab.io/${projectSlug()}`
    );
  }
  const user = process.env.GITHUB_REPOSITORY?.split("/")[0] || namespaceSlug();
  return process.env.GITHUB_PAGES_URL || `https://${user}.github.io/${projectSlug()}`;
}

function usePagesShell(host) {
  return host === "gitlab-pages" || host === "github-pages";
}

function assertDistAssets() {
  const assetsDir = join(dist, "assets");
  if (!existsSync(assetsDir)) {
    console.error("dist/assets/ não existe — bundles JS/CSS em falta");
    process.exit(1);
  }
  const files = readdirSync(assetsDir);
  const js = files.filter((f) => f.endsWith(".js"));
  if (js.length === 0) {
    console.error("dist/assets/ sem ficheiros .js");
    process.exit(1);
  }
  console.log(`   assets OK: ${js.length} JS, ${files.filter((f) => f.endsWith(".css")).length} CSS`);
}

function normalizePagesIndex() {
  const pagesHtml = join(dist, "index.pages.html");
  const indexHtml = join(dist, "index.html");
  if (existsSync(pagesHtml)) {
    writeFileSync(indexHtml, readFileSync(pagesHtml, "utf8"));
    rmSync(pagesHtml);
    console.log("   index.pages.html → index.html");
  }
  if (!existsSync(indexHtml)) {
    console.error("dist/index.html não gerado");
    process.exit(1);
  }
}

function stripSpaRedirects(host) {
  const redirectsPath = join(dist, "_redirects");
  if (existsSync(redirectsPath) && host !== "cloudflare-pages") {
    rmSync(redirectsPath);
    console.log("   removido _redirects (evita MIME text/html em /assets/* no GitLab/GitHub)");
  }
}

/** Garante que paths em index.html apontam para ficheiros reais em dist/assets/. */
function assertIndexAssetRefs() {
  const html = readFileSync(join(dist, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="(\/(?:[^"]*\/)?assets\/[^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    const name = ref.split("/assets/")[1];
    const disk = join(dist, "assets", name);
    if (!existsSync(disk)) {
      console.error(`index.html → ${ref} mas ${disk} não existe (base path errado?)`);
      process.exit(1);
    }
  }
  if (refs.length > 0) {
    console.log(`   index.html refs OK (${refs.length} assets)`);
  }
}

/** Copia index.html para cada rota SPA → HTTP 200 no GitLab (sem depender só de 404.html). */
function materializeSpaRouteHtml(indexHtml) {
  for (const route of PAGES_SHELL_ROUTES) {
    const dir = join(dist, route);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), indexHtml);
  }
  console.log(`   rotas SPA materializadas: ${PAGES_SHELL_ROUTES.join(", ")}`);
}

/** @param {{ host?: StaticHost, defaultBase?: string }} opts */
export function runStaticPwaBuild(opts = {}) {
  const host = opts.host ?? process.env.STATIC_HOST ?? "gitlab-pages";
  const pagesShell = usePagesShell(host);
  const base = process.env.VITE_PAGES_BASE || opts.defaultBase || defaultBaseForHost(host);
  const baseNorm = base === "/" ? "/" : base.endsWith("/") ? base : `${base}/`;
  const hostLabel = hostLabelFor(host);
  const viteMode = pagesShell ? "pages" : "sovereign";

  console.log(`\n📄 ${hostLabel} build — base: ${baseNorm} — mode: ${viteMode}`);
  if (host === "gitlab-pages") {
    console.log(`   CI_PAGES_URL: ${process.env.CI_PAGES_URL || process.env.GITLAB_PAGES_URL || "(local fallback)"}\n`);
  } else {
    console.log("");
  }

  const apiOrigin = process.env.VITE_PAGES_API_ORIGIN || process.env.PAGES_API_ORIGIN;
  const env = {
    ...process.env,
    VITE_PAGES_BASE: baseNorm === "/" ? "/" : baseNorm,
    VITE_PAGES_SHELL: pagesShell ? "1" : "0",
    VITE_IMC_V2: pagesShell ? "false" : (process.env.VITE_IMC_V2 ?? "true"),
    VITE_IMC_SLIM: pagesShell ? "true" : (process.env.VITE_IMC_SLIM ?? "false"),
    VITE_ETERNET_ENGINE: process.env.VITE_ETERNET_ENGINE ?? "hybrid",
  };

  if (apiOrigin) {
    const origin = apiOrigin.replace(/\/$/, "");
    Object.assign(env, {
      VITE_PAGES_API_ORIGIN: origin,
      VITE_API_BASE: origin,
      VITE_AQRE_API_URL: `${origin}/api/aqre`,
      VITE_LUSUS_API_URL: `${origin}/api/lusus`,
      VITE_IMC_API_URL: `${origin}/api/imc`,
      VITE_ETERNET_API_URL: `${origin}/api/eternet`,
      VITE_ECONOMY_API: `${origin}/api/economy`,
      VITE_MESH_LIQUIDITY_API: `${origin}/api/mesh/liquidity`,
      VITE_VOID_API_URL: `${origin}/api/void`,
      VITE_ISOSSUPRA_API_URL: `${origin}/api/isossupra`,
    });
    console.log(`   API origin (VPS opcional): ${origin}`);
  }

  if (!pagesShell) {
    execSync("npm run build:wasm", { cwd: root, stdio: "inherit", env });
  } else {
    console.log("   Pages shell — WASM omitido (dev local: npm run build:wasm)");
  }

  execSync(`./node_modules/.bin/vite build --mode ${viteMode}`, {
    cwd: root,
    stdio: "inherit",
    env,
    shell: true,
  });

  if (!existsSync(dist)) {
    console.error("dist/ não gerado");
    process.exit(1);
  }

  normalizePagesIndex();
  stripSpaRedirects(host);
  assertDistAssets();
  assertIndexAssetRefs();

  const indexHtml = readFileSync(join(dist, "index.html"), "utf8");

  if (pagesShell) {
    materializeSpaRouteHtml(indexHtml);
  }

  /** GitHub + GitLab Pages: 404.html = fallback para rotas não materializadas */
  if (host === "github-pages" || host === "gitlab-pages") {
    writeFileSync(join(dist, "404.html"), indexHtml);
  }
  if (host === "github-pages") {
    writeFileSync(join(dist, ".nojekyll"), "");
  }

  if (host === "cloudflare-pages") {
    writeFileSync(join(dist, "_redirects"), "/*    /index.html   200\n");
    const headersPath = join(dist, "_headers");
    if (!existsSync(headersPath)) {
      writeFileSync(
        headersPath,
        ["/assets/*.wasm", "  Content-Type: application/wasm", "  Cache-Control: public, max-age=31536000, immutable", ""].join(
          "\n",
        ),
      );
    }
  }

  const manifestPath = join(dist, "manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.start_url = baseNorm;
    if (Array.isArray(manifest.shortcuts)) {
      const prefix = baseNorm === "/" ? "" : baseNorm.replace(/\/$/, "");
      manifest.shortcuts = manifest.shortcuts.map((s) => ({
        ...s,
        url: s.url?.startsWith("/") ? `${prefix}${s.url}` : s.url,
      }));
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  for (const extra of ["injectors", "DOC"]) {
    const src = join(root, "public", extra);
    const dest = join(dist, extra);
    if (existsSync(src)) cpSync(src, dest, { recursive: true });
  }
  const srcInjectors = join(root, "src/injectors");
  if (existsSync(srcInjectors)) {
    mkdirSync(join(dist, "injectors"), { recursive: true });
    for (const f of readdirSync(srcInjectors)) {
      if (f.endsWith(".user.js")) {
        cpSync(join(srcInjectors, f), join(dist, "injectors", f));
      }
    }
  }

  const url = canonicalUrl(host);
  writeFileSync(
    join(dist, "pages-config.json"),
    `${JSON.stringify(
      {
        hostedOn: host,
        base: baseNorm,
        url,
        apiOrigin: apiOrigin || null,
        model: pagesShell ? "production-pages-shell" : "protocol-first-static-pwa",
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );

  console.log(`\n✅ dist/ pronto para ${hostLabel}`);
  console.log(`   URL: ${url}/`);
  if (host === "gitlab-pages") {
    console.log("   Deploy: git push gitlab main");
  } else if (host === "cloudflare-pages") {
    console.log("   Deploy: gh workflow run cloudflare-pages-deploy.yml");
  } else {
    console.log("   Deploy: push main (GitHub Pages CI)");
  }
  console.log("   Local: npx serve dist -l 4173\n");
}
