// Adapts a freshly cloned actions/checkout to being consumed as a library by
// this action. Run by `pnpm run vendor`; see src/vendor/README.md.

import { readFileSync, writeFileSync } from "node:fs";

const DIR = "src/vendor/checkout";

// The vendored copy is a pnpm workspace package, so its devDependencies would
// be installed alongside this project's. Nothing here runs its tests, lint or
// bundler, and its Jest shadows the root Jest when both are present.
const pkgPath = `${DIR}/package.json`;
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
delete pkg.devDependencies;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

// `src/main.ts` imports `checkout/lib/*`, so the compiled output has to carry
// its type declarations. Upstream only emits JavaScript.
const tsconfigPath = `${DIR}/tsconfig.json`;
const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf8"));
tsconfig.compilerOptions.declaration = true;
writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);

console.log(`${DIR}: dropped devDependencies, enabled declaration output`);
