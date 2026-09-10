---
'@medalsocial/pilot': patch
---

Close every advisory reaching the published CLI.

`pnpm audit` reported 31, including a critical `shell-quote` and a high `ws`
that shipped to consumers through `ink`. Runtime dependencies move directly
(`ws` ^8.21.3, `ink` 7.1.1, `react` 19.2.8, `smol-toml` 1.8.0, `open` ^11.0.2,
`zod` 4.5.4); the transitive-only ones move by override. Now zero.
