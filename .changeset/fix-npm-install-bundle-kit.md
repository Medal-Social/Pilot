---
'@medalsocial/pilot': patch
---

Fix `npm install @medalsocial/pilot` failing with a 404.

The published manifest declared `@medalsocial/kit` as a runtime dependency.
kit is `private: true` and is never published, but `pnpm publish` rewrites
`workspace:*` to the concrete version, so every tarball shipped
`"@medalsocial/kit": "0.4.0"` and every install died with:

    npm error 404 Not Found - GET https://registry.npmjs.org/@medalsocial%2fkit

The prebuilt binaries were never affected — `bun build --compile` already
inlines everything — so only the npm install path was broken.

kit is now inlined into the CLI's entry points at build time and dropped from
the published dependencies.
