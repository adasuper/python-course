// Fails the build if the app download (excluding Pyodide) grows past its budget (§17).
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = join(import.meta.dirname, '..', 'dist');
const BUDGET_GZIP = 4 * 1024 * 1024;
const MAIN_JS_BUDGET_GZIP = 900 * 1024;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

let total = 0;
let largestJs = { file: '', size: 0 };
for (const file of walk(DIST)) {
  const rel = relative(DIST, file);
  if (rel.startsWith('pyodide')) continue;
  if (rel.endsWith('preview.html')) continue;
  const size = gzipSync(readFileSync(file)).length;
  total += size;
  if (rel.endsWith('.js') && size > largestJs.size) largestJs = { file: rel, size };
}
const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
console.log(
  `size: app ${kb(total)} gzip (budget ${kb(BUDGET_GZIP)}), largest JS ${largestJs.file} ${kb(largestJs.size)} (budget ${kb(MAIN_JS_BUDGET_GZIP)})`,
);
if (total > BUDGET_GZIP || largestJs.size > MAIN_JS_BUDGET_GZIP) {
  console.error('✗ size budget exceeded');
  process.exit(1);
}
