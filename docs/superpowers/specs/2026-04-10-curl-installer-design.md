# Curl Installer & Landing Page

## Goal

Ship `curl -fsSL pilot.medalsocial.com/install | sh` — a single command that installs Pilot on macOS, Linux, or Windows (WSL) without requiring Node.js. Also serve a branded landing page at `pilot.medalsocial.com`.

## Architecture

Three independent pieces:

1. **Install script** (`scripts/install.sh`) — detects platform, installs via npm or standalone binary
2. **Binary build pipeline** (GitHub Actions) — produces standalone binaries per platform using ncc + Node.js SEA
3. **Cloudflare Worker** — serves the landing page at `/` and the install script at `/install`

## 1. Install Script

Shell script at `scripts/install.sh`. The user runs:

```bash
curl -fsSL pilot.medalsocial.com/install | sh
```

### Flow

1. Detect OS: macOS (`darwin`), Linux (`linux`), or Windows WSL
2. Detect architecture: `arm64` or `x64`
3. Check if Node.js 24+ exists on PATH
   - **Yes** → run `npm install -g @medalsocial/pilot` and exit
   - **No** → continue to binary install
4. Download binary from `github.com/Medal-Social/pilot/releases/latest/download/pilot-{os}-{arch}`
5. Install to `~/.pilot/bin/pilot`
6. Add `~/.pilot/bin` to PATH by appending to `~/.zshrc`, `~/.bashrc`, or `~/.profile` (whichever exists)
7. Print success: "Pilot installed! Run `pilot` to get started."

### User-facing language

Per CLAUDE.md conventions: no package manager names, no version numbers, no file paths in output. Just clean messages:

- "Checking your system..."
- "Installing Pilot..."
- "Pilot installed! Run `pilot` to get started."
- On error: "Something went wrong. Visit github.com/Medal-Social/pilot for help."

### Windows (non-WSL)

`curl | sh` doesn't work natively on Windows outside WSL. If the script detects native Windows (unlikely via this path), it prints:

> "For Windows, install via npm: `npm install -g @medalsocial/pilot`
> Or download from github.com/Medal-Social/pilot/releases"

## 2. Binary Build Pipeline

A GitHub Actions workflow (`build-binaries.yml`) triggered alongside `release.yml` on version tags.

### Build steps

1. **Bundle** — `npx ncc build dist/bin/pilot.js -o build/` to produce a single JS file with all dependencies inlined
2. **Generate SEA blob** — use Node.js SEA (Single Executable Application) API to create a platform-specific binary
3. **Upload** — attach binaries to the GitHub Release as assets

### Target matrix

| Binary name | OS | Arch | Runner |
|---|---|---|---|
| `pilot-darwin-arm64` | macOS | Apple Silicon | `macos-latest` |
| `pilot-darwin-x64` | macOS | Intel | `macos-latest` (cross-compile) |
| `pilot-linux-arm64` | Linux | arm64 | `ubuntu-latest` (cross-compile) |
| `pilot-linux-x64` | Linux | x64 | `ubuntu-latest` |
| `pilot-win-x64.exe` | Windows | x64 | `windows-latest` |

### Node.js SEA process

For each platform:

1. Create SEA config (`sea-config.json`):
   ```json
   {
     "main": "build/index.js",
     "output": "sea-prep.blob",
     "disableExperimentalSEAWarning": true
   }
   ```
2. Generate blob: `node --experimental-sea-config sea-config.json`
3. Copy node binary: `cp $(which node) pilot`
4. Inject blob: `npx postject pilot NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`
5. On macOS: strip signature, re-sign with ad-hoc after injection

## 3. Cloudflare Worker

A worker deployed to `pilot.medalsocial.com` via Wrangler.

### Routing

| Route | Response |
|---|---|
| `/install` | `text/plain` — the install script content |
| `/` and everything else | `text/html` — the landing page |

### Landing page design

Dark theme matching the medal-monorepo PR redirect style. See mockup at `docs/designs/landing-page.png`.

- **Background**: `#0A0A14` with subtle purple radial glow
- **Nav**: Pilot logo + brand left, Docs/GitHub/npm links right
- **Hero**: Badge pill ("Open Source · Local-First · Private by Design"), headline "Your AI crew, ready to fly.", subtitle, install command box with copy button, npm fallback text
- **Features**: 4 cards — Five AI Crew Leads, Private by Design, Plugin System, Works Everywhere
- **Footer**: Copyright + social links (LinkedIn, Instagram, X)
- **Font**: Geist Sans via CDN
- **Color palette**: deep purple `#7E3FAC`, dark navy `#0A0A14`, muted grays

HTML/CSS is self-contained in the worker — no external assets except the font CDN.

### DNS setup

- Add CNAME record `pilot` on Cloudflare pointing to the worker route
- Or use Cloudflare Workers custom domain routing

### Deployment

- Worker source lives at `workers/pilot-landing/` in the repo
- Deploy via `wrangler deploy`
- Optionally add a GitHub Action to auto-deploy on changes to the worker source

## File map

| Action | Path | Purpose |
|---|---|---|
| Create | `scripts/install.sh` | Install script |
| Create | `.github/workflows/build-binaries.yml` | Binary build pipeline |
| Create | `workers/pilot-landing/src/index.ts` | Cloudflare Worker |
| Create | `workers/pilot-landing/wrangler.toml` | Worker config |
| Create | `workers/pilot-landing/package.json` | Worker deps |

## Out of scope

- Homebrew tap (future, separate effort)
- Auto-update mechanism (pilot already has `pilot update`)
- Windows native installer (.msi/.exe)
- Custom domain SSL (Cloudflare handles this automatically)

## Success criteria

- `curl -fsSL pilot.medalsocial.com/install | sh` installs Pilot on a fresh macOS/Linux machine without Node.js
- Same command uses npm when Node.js 24+ is available
- `pilot.medalsocial.com` shows the branded landing page
- Binaries are automatically built and attached to GitHub Releases on each tag
