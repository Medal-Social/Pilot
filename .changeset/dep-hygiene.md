---
'@medalsocial/pilot': patch
---

chore: dependency hygiene — drop unused `ink-text-input` from cli runtime deps, consolidate `react-devtools-core` to a single declaration (devDep only, removing the duplicate CI install step), pin `typescript` and `vitest` exactly in the kit workspace to match root, add a `commitlint-pr-title` CI gate so non-conventional PR titles fail before merge, and fix the stale build-pipeline note in CLAUDE.md.
