import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });

await cp('out', 'dist', { recursive: true });

const workerSource = await readFile('server/worker.mjs', 'utf8');
await writeFile('dist/server/index.js', workerSource, 'utf8');
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
