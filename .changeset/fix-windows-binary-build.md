---
'@medalsocial/pilot': patch
---

fix(ci): make Windows binary build work and stop matrix fail-fast from skipping uploads. Replace `inject-version.sh` with a portable Node ESM script (works on Windows git-bash where POSIX path translation breaks `node -p`), set `fail-fast: false` on the binary matrix, and let `upload-release` run on partial matrix success so single-target failures no longer skip publishing assets to the release.
