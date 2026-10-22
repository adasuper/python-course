import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

// CODEWEALD_BASE lets the game live under a sub-path, e.g. /python-course/ on GitHub Pages.
const base = process.env.CODEWEALD_BASE ?? '/';

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

export default defineConfig({
  base,
  plugins: [preact(), contentHotReload()],
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  server: { port: 5173 },
  preview: { port: 4173 },
});
