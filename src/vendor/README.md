# Vendored dependencies

`checkout/` is a copy of [actions/checkout](https://github.com/actions/checkout)
v7.0.1, imported by `pnpm run vendor`. Only its `src/` is used: `pnpm run
build-checkout` compiles it with this repository's TypeScript, and `src/main.ts`
imports the result as `checkout/lib/*`.

It is a pnpm workspace package (see `pnpm-workspace.yaml`), so pnpm installs its
runtime dependencies next to it instead of relying on a flat, hoisted
`node_modules`.

`pnpm run vendor` re-applies everything this copy needs, so re-running it is
enough to move to a newer checkout release (change the tag in the script first):

- `dist/` and `package-lock.json` are deleted. The bundle is upstream's build
  output, unused here and 1.4MB; the lockfile is superseded by the root
  `pnpm-lock.yaml`.
- `scripts/vendor-patch.mjs` drops `devDependencies` and turns on `declaration`
  in `tsconfig.json`. The dev tooling would otherwise be installed as part of
  this workspace — and its Jest shadows the root Jest — while the type
  declarations are what let `src/main.ts` import the compiled output.

Upstream is ESM as of v7 and this project is CommonJS. That only works because
esbuild bundles both into one CJS file; `tsc` type checks across the boundary
without emitting the import.
