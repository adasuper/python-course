import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// CODEWEALD_BASE lets the game live under a sub-path, e.g. /python-course/ on GitHub Pages.
const base = process.env.CODEWEALD_BASE ?? '/';

const pyodideVersion = (
  JSON.parse(readFileSync(join(import.meta.dirname, 'node_modules/pyodide/package.json'), 'utf8')) as {
    version: string;
  }
).version;

/** Offline play (docs/specs.md §16): the app is precached; Python is cached the first time it
 *  loads (CacheFirst), so it is downloaded only once. A new version waits for the student. */
function offline() {
  return VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    // The icons are already in the precache (the png glob below); listing them twice with
    // different revisions would stop the service worker from installing.
    includeManifestIcons: false,
    manifest: {
      name: 'Codeweald',
      short_name: 'Codeweald',
      description: 'Learn Python by restoring the Great Script.',
      display: 'standalone',
      start_url: '.',
      scope: '.',
      background_color: '#20192b',
      theme_color: '#20192b',
      icons: [
        { src: 'assets/art/app/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: 'assets/art/app/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    workbox: {
      // woff2 only: every browser that runs the game reads woff2, so .woff is never fetched.
      globPatterns: ['**/*.{html,js,css,woff2,png,json,svg}'],
      globIgnores: ['pyodide/**', 'assets/art/preview.html'],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      navigateFallback: 'index.html',
      clientsClaim: true,
      skipWaiting: false,
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname.includes('/pyodide/'),
          handler: 'CacheFirst',
          options: {
            cacheName: `pyodide-${pyodideVersion}`,
            cacheableResponse: { statuses: [200] },
            // Servers may send "Vary: Origin". Pyodide imports one file as a module (which
            // sends an Origin header) after fetching it plainly (which doesn't), and the
            // files are the same either way.
            matchOptions: { ignoreVary: true },
          },
        },
      ],
    },
  });
}

/** In `npm run dev`, saving a YAML file under content/ recompiles the content, and the
 *  game reloads with it (F-AUT-08). */
function contentHotReload(): Plugin {
  const contentDir = join(import.meta.dirname, 'content');
  let running = false;
  let again = false;
  const rebuild = () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/build-content.ts'], {
      cwd: import.meta.dirname,
      stdio: 'inherit',
    });
    child.on('exit', () => {
      running = false;
      if (again) {
        again = false;
        rebuild();
      }
    });
  };
  return {
    name: 'codeweald-content-hot-reload',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add(contentDir);
      const onChange = (file: string) => {
        if (file.startsWith(contentDir) && file.endsWith('.yaml')) rebuild();
      };
      server.watcher.on('change', onChange);
      server.watcher.on('add', onChange);
    },
  };
}

/** E2E only (CODEWEALD_TEST_SERVER=1 on `vite preview`), for tests/e2e/offline.spec.ts:
 *  - `/__codeweald-requests` counts the real downloads of Python's files, so a test can prove
 *    each one is downloaded once (F-OFF-02). The browser doesn't report the service worker's
 *    own requests, but the server sees them all.
 *  - POST/DELETE `/__codeweald-next-version` serves a changed sw.js, as if a new version had
 *    been published (F-OFF-04). */
function testServerHooks(): Plugin {
  const counts: Record<string, number> = {};
  let nextVersion = false;
  return {
    name: 'codeweald-test-server-hooks',
    configurePreviewServer(server) {
      if (!process.env.CODEWEALD_TEST_SERVER) return;
      const sw = join(server.config.root, server.config.build.outDir, 'sw.js');
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0]!;
        if (path.endsWith('/__codeweald-requests')) {
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(counts));
          return;
        }
        if (path.endsWith('/__codeweald-next-version')) {
          nextVersion = req.method === 'POST';
          res.end('ok');
          return;
        }
        if (nextVersion && path.endsWith('/sw.js')) {
          res.setHeader('content-type', 'text/javascript');
          res.setHeader('cache-control', 'no-cache');
          res.end(`${readFileSync(sw, 'utf8')}\n// next version\n`);
          return;
        }
        if (req.method === 'GET' && path.includes('/pyodide/')) {
          const file = path.slice(path.lastIndexOf('/') + 1);
          counts[file] = (counts[file] ?? 0) + 1;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base,
  plugins: [preact(), contentHotReload(), offline(), testServerHooks()],
  define: { __PYODIDE_VERSION__: JSON.stringify(pyodideVersion) },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
