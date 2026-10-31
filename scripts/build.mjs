import { mkdir, copyFile, writeFile } from 'node:fs/promises';
const output = new URL('../dist/', import.meta.url);
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'style.css', 'app.js']) {
  await copyFile(new URL('../' + name, import.meta.url), new URL(name, output));
}
await writeFile(new URL('.nojekyll', output), '');
console.log('Built static game in dist/');
