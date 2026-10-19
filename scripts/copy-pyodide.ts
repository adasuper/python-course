// Copies the Pyodide runtime from node_modules into public/pyodide so it is served
// from our own origin (no CDN) and works offline.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pyodideDir = dirname(require.resolve('pyodide/package.json'));
const outDir = join(process.cwd(), 'public', 'pyodide');
const FILES = [
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

mkdirSync(outDir, { recursive: true });
let copied = 0;
for (const file of FILES) {
  const from = join(pyodideDir, file);
  const to = join(outDir, file);
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  copyFileSync(from, to);
  copied++;
}
console.log(`pyodide: ${copied} file(s) copied to public/pyodide (${FILES.length} total)`);
