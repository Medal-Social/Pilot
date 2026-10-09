---
'@medalsocial/pilot': patch
---

Move every dependency to its current release and clear the remaining advisories.

Runtime: `ink` 8, `commander` 15, `@napi-rs/keyring` 2, `react` 19.3, `zod` 4.6,
`smol-toml` 1.9, `ws` 8.22, `open` 11.0.4. Tooling: TypeScript 7, Vitest 5.0.3,
Biome 2.5, changesets 3, commitlint 21, knip 6.40, turbo 2.11, wrangler 4.149.
Overrides now use `>=` floors so transitive patches flow in on their own.
`pnpm audit` and the landing worker's `npm audit` both report zero.

Also restores the 0.7.1 version and changelog entry that the last promote
dropped, so the next release versions to 0.7.2 instead of colliding with the
already-published 0.7.1.
