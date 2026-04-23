---
"@medalsocial/pilot": patch
---

Installer and release binary fixes:

- `scripts/install.sh` now resolves the current release via the npm `latest` dist-tag and no longer depends on GitHub release tag format, so the curl one-liner installs the real latest version (previously it silently picked up a stale cached `0.1.5`).
- The release binary build (`pilot-darwin-arm64`, `pilot-darwin-x64`, `pilot-linux-*`, `pilot-win-x64.exe`) runs `pnpm build` at the workspace root so the kit package is built before the CLI. Prior releases since `0.1.7` had no attached binaries because the CLI-only build failed to resolve `@medalsocial/kit`'s types.
- Automated `dev → prod` promotion workflow (`.github/workflows/promote.yml`) runs on weekdays and on manual dispatch so routine releases flow without human intervention.
