import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const output = new URL('../dist/', import.meta.url);
await mkdir(output, { recursive: true });
let html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
for (const name of ['style.css', 'app.js']) {
  const source = new URL('../' + name, import.meta.url);
  const hash = createHash('sha256').update(await readFile(source)).digest('hex').slice(0, 12);
  await copyFile(source, new URL(name, output));
  html = html.replace(`./${name}`, `./${name}?v=${hash}`);
}
await writeFile(new URL('index.html', output), html);
await writeFile(new URL('.nojekyll', output), '');
console.log('Built static game in dist/ with versioned assets');
