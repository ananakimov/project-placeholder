import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);

// Use Start's SPA shell so the same React application can run on static hosting.
rmSync("dist", { recursive: true, force: true });
const build = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
  stdio: "inherit",
  env: { ...process.env, GITHUB_PAGES: "true" },
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const output = "dist/client";
const shell = `${output}/index.html`;
if (!existsSync(shell)) throw new Error("The GitHub Pages SPA shell was not generated.");

// Pages has no server rewrites. Give the prototype's routes their own entry
// documents so bookmarks and refreshes return HTTP 200, with a fallback for others.
const routes = [
  "checks",
  "checks/new",
  "archive",
  "log",
  ...["a", "b", "c", "g"].flatMap((id) =>
    ["", "/documents", "/exceptions", "/conclusion", "/log"].map(
      (suffix) => `checks/${id}${suffix}`,
    ),
  ),
];
for (const route of routes) {
  mkdirSync(`${output}/${route}`, { recursive: true });
  copyFileSync(shell, `${output}/${route}/index.html`);
}
copyFileSync(shell, `${output}/404.html`);
writeFileSync(`${output}/.nojekyll`, "");
console.log(`GitHub Pages output: ${output} (${routes.length + 1} entry pages).`);
