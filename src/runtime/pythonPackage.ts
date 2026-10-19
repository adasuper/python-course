// Installs the codeweald Python package into a Pyodide instance.
// Used by the browser worker and by Node tools/tests, so both run identical code.
import type { PyodideInterface } from 'pyodide';

export const PACKAGE_ROOT = '/codeweald_lib';

/** `files` maps a file name such as "_world.py" to its source text. */
export function installPackage(pyodide: PyodideInterface, files: Record<string, string>): void {
  const dir = `${PACKAGE_ROOT}/codeweald`;
  pyodide.FS.mkdirTree(dir);
  for (const [name, source] of Object.entries(files)) {
    pyodide.FS.writeFile(`${dir}/${name}`, source);
  }
  pyodide.runPython(
    `import sys\nif ${JSON.stringify(PACKAGE_ROOT)} not in sys.path:\n    sys.path.insert(0, ${JSON.stringify(PACKAGE_ROOT)})\nimport codeweald._host`,
  );
}
