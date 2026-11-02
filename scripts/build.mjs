import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/client.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
// DSH client modules use the host's module loader, not browser ES imports.
const body = source.replace(/^export /gm, '');
const output = `window.__ModuleLoader__.load({\n  id: "dsh-doc-focus",\n  factory: (require) => {\n    const STYLE = ${JSON.stringify(css)};\n${body}\n    return { apply };\n  }\n});\n`;
await mkdir(new URL('../lib/', import.meta.url), { recursive: true });
await writeFile(new URL('../lib/client.js', import.meta.url), output);
await copyFile(new URL('../src/index.js', import.meta.url), new URL('../lib/index.js', import.meta.url));
console.log('Built dsh-doc-focus (no bundled renderer or copied composer).');
