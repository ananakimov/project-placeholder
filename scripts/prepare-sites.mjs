import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
// Retain the existing TanStack/Nitro build and adapt its output for Sites.
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/server', { recursive: true });
cpSync('.output/server', 'dist/server', { recursive: true });
cpSync('.output/public', 'dist/client', { recursive: true });
writeFileSync('dist/server/index.js', 'export { default } from "./index.mjs";\n');
