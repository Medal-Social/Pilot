---
"@medalsocial/pilot": patch
---

Install experience and release pipeline fixes:

- The one-line install always grabs the current Pilot release, not a stale cache.
- Release downloads now include prebuilt binaries for macOS (Intel + Apple Silicon), Linux (x64 + arm64), and Windows.
- Routine promotions from the dev channel to prod run on a schedule without manual effort.
