# Vendored dependencies

`checkout/` is a copy of [actions/checkout](https://github.com/actions/checkout)
v2.5.0, imported by `pnpm run vendor`. Only its `src/` is used: `pnpm run
build-checkout` compiles it with this repository's TypeScript, and `src/main.ts`
imports the result as `checkout/lib/*`.

It is a pnpm workspace package (see `pnpm-workspace.yaml`), so pnpm installs its
runtime dependencies next to it instead of relying on a flat, hoisted
`node_modules`. Re-running `pnpm run vendor` restores the upstream files, so
these three edits have to be re-applied afterwards:

- Add `@octokit/rest` to `dependencies`. `github-api-helper.ts` imports it
  directly but upstream never declared it; npm only resolved it because
  `@actions/github` v2 hoisted it.
- Drop every `devDependency` except the `@types/*` packages. The test, lint and
  bundling tooling is unused here, and its Jest 27 shadowed the root Jest when
  both were installed.
- Delete `package-lock.json`; the workspace is locked by the root
  `pnpm-lock.yaml`.
