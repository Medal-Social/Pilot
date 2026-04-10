# Curl Installer & Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `curl -fsSL pilot.medalsocial.com/install | sh` with a branded landing page, standalone binary builds, and Homebrew tap.

**Architecture:** Cloudflare Worker serves landing page (`/`) and install script (`/install`). GitHub Actions builds standalone binaries via ncc + Node.js SEA. Install script auto-detects Node.js → npm path or downloads binary. Homebrew tap provides `brew install` alternative.

**Tech Stack:** Cloudflare Workers (Wrangler), Node.js SEA, @vercel/ncc, GitHub Actions, Homebrew

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `workers/pilot-landing/src/index.ts` | Cloudflare Worker (landing page + install script) |
| Create | `workers/pilot-landing/wrangler.toml` | Worker config |
| Create | `workers/pilot-landing/package.json` | Worker deps |
| Create | `workers/pilot-landing/tsconfig.json` | TypeScript config |
| Create | `scripts/install.sh` | Install shell script |
| Create | `scripts/sea-config.json` | Node.js SEA config |
| Create | `.github/workflows/build-binaries.yml` | Binary build pipeline |
| Create | `homebrew-pilot/pilot.rb` | Homebrew formula |
| Create | `homebrew-pilot/README.md` | Homebrew tap README |

---

### Task 1: Cloudflare Worker — Landing Page & Install Route

**Files:**
- Create: `workers/pilot-landing/package.json`
- Create: `workers/pilot-landing/tsconfig.json`
- Create: `workers/pilot-landing/wrangler.toml`
- Create: `workers/pilot-landing/src/index.ts`

- [ ] **Step 1: Create worker package.json**

```bash
mkdir -p workers/pilot-landing/src
```

Create `workers/pilot-landing/package.json`:

```json
{
  "name": "pilot-landing",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `workers/pilot-landing/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create wrangler.toml**

Create `workers/pilot-landing/wrangler.toml`:

```toml
name = "pilot-landing"
main = "src/index.ts"
compatibility_date = "2026-04-10"

# After DNS setup, add:
# routes = [
#   { pattern = "pilot.medalsocial.com", custom_domain = true }
# ]
```

- [ ] **Step 4: Create the worker with landing page HTML**

Create `workers/pilot-landing/src/index.ts` with the full worker implementation. The worker handles two routes:

- `GET /install` → returns the install script as `text/plain`
- Everything else → returns the landing page as `text/html`

```typescript
const INSTALL_SCRIPT = `#!/bin/sh
set -e

REPO="Medal-Social/pilot"
INSTALL_DIR="\$HOME/.pilot/bin"

main() {
  echo "Checking your system..."

  OS="\$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH="\$(uname -m)"

  case "\$OS" in
    linux*)  OS="linux" ;;
    darwin*) OS="darwin" ;;
    mingw*|msys*|cygwin*)
      echo "For Windows, install via: npm install -g @medalsocial/pilot"
      echo "Or download from https://github.com/\$REPO/releases"
      exit 0
      ;;
    *) echo "Unsupported operating system: \$OS"; exit 1 ;;
  esac

  case "\$ARCH" in
    x86_64|amd64) ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *) echo "Unsupported architecture: \$ARCH"; exit 1 ;;
  esac

  # Check for Node.js 24+
  if command -v node >/dev/null 2>&1; then
    NODE_MAJOR="\$(node -v | sed 's/v//' | cut -d. -f1)"
    if [ "\$NODE_MAJOR" -ge 24 ] 2>/dev/null; then
      echo "Installing Pilot..."
      npm install -g @medalsocial/pilot
      echo ""
      echo "Pilot installed! Run \\\`pilot\\\` to get started."
      exit 0
    fi
  fi

  # Download standalone binary
  echo "Installing Pilot..."

  BINARY="pilot-\$OS-\$ARCH"
  if [ "\$OS" = "win" ]; then
    BINARY="\$BINARY.exe"
  fi

  URL="https://github.com/\$REPO/releases/latest/download/\$BINARY"

  mkdir -p "\$INSTALL_DIR"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "\$URL" -o "\$INSTALL_DIR/pilot"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "\$INSTALL_DIR/pilot" "\$URL"
  else
    echo "Something went wrong. Visit https://github.com/\$REPO for help."
    exit 1
  fi

  chmod +x "\$INSTALL_DIR/pilot"

  # Add to PATH if not already there
  case ":\$PATH:" in
    *":\$INSTALL_DIR:"*) ;;
    *)
      SHELL_NAME="\$(basename "\$SHELL")"
      case "\$SHELL_NAME" in
        zsh)  PROFILE="\$HOME/.zshrc" ;;
        bash) PROFILE="\$HOME/.bashrc" ;;
        *)    PROFILE="\$HOME/.profile" ;;
      esac
      echo "" >> "\$PROFILE"
      echo "# Pilot CLI" >> "\$PROFILE"
      echo "export PATH=\\"\\\$HOME/.pilot/bin:\\\$PATH\\"" >> "\$PROFILE"
      echo ""
      echo "Pilot installed! Restart your terminal, then run \\\`pilot\\\` to get started."
      exit 0
      ;;
  esac

  echo ""
  echo "Pilot installed! Run \\\`pilot\\\` to get started."
}

main
`;

const MEDAL_LOGO_SVG = \`<svg width="40" height="40" viewBox="0 0 300 300" fill="none" aria-hidden="true">
  <rect width="300" height="300" rx="48" fill="url(#g)"/>
  <path d="M42.4434 149.999L149.998 42.4443L257.554 149.999L149.998 257.555L42.4434 149.999Z" stroke="white" stroke-width="5"/>
  <circle cx="149.999" cy="45.806" r="16.8" fill="white"/>
  <circle cx="254.195" cy="150" r="16.8" fill="white"/>
  <circle cx="149.999" cy="254.193" r="16.8" fill="white"/>
  <circle cx="45.806" cy="150" r="16.8" fill="white"/>
  <path d="M136.134 173.527C135.534 171.201 134.322 169.078 132.623 167.379C130.924 165.68 128.801 164.468 126.475 163.867L85.2339 153.233C84.5303 153.033 83.911 152.609 83.4701 152.026C83.0291 151.442 82.7905 150.731 82.7905 149.999C82.7905 149.268 83.0291 148.557 83.4701 147.973C83.911 147.39 84.5303 146.966 85.2339 146.766L126.475 136.125C128.8 135.525 130.923 134.314 132.621 132.616C134.32 130.919 135.533 128.797 136.134 126.472L146.769 85.2312C146.967 84.5248 147.39 83.9025 147.974 83.4591C148.559 83.0158 149.272 82.7759 150.006 82.7759C150.739 82.7759 151.452 83.0158 152.037 83.4591C152.621 83.9025 153.045 84.5248 153.242 85.2312L163.87 126.472C164.47 128.798 165.683 130.921 167.382 132.62C169.081 134.319 171.204 135.531 173.53 136.132L214.771 146.759C215.48 146.955 216.105 147.378 216.551 147.963C216.997 148.548 217.238 149.264 217.238 149.999C217.238 150.735 216.997 151.451 216.551 152.036C216.105 152.621 215.48 153.044 214.771 153.24L173.53 163.867C171.204 164.468 169.081 165.68 167.382 167.379C165.683 169.078 164.47 171.201 163.87 173.527L153.236 214.768C153.038 215.474 152.615 216.097 152.03 216.54C151.446 216.983 150.732 217.223 149.999 217.223C149.265 217.223 148.552 216.983 147.968 216.54C147.383 216.097 146.96 215.474 146.762 214.768L136.134 173.527Z" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <defs>
    <radialGradient id="g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(150 150) rotate(90) scale(225 150)">
      <stop stop-color="#420068"/><stop offset="0.42" stop-color="#2C004A"/><stop offset="1" stop-color="#15002C"/>
    </radialGradient>
  </defs>
</svg>\`;

const LINKEDIN_SVG = \`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>\`;
const INSTAGRAM_SVG = \`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.88 0 1.441 1.441 0 012.88 0z"/></svg>\`;
const X_SVG = \`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>\`;

function buildLandingPage(): Response {
  const html = \`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="description" content="Your AI crew, ready to fly. Medal Social's AI-powered CLI platform."/>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-sans/style.min.css"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-mono/style.min.css"/>
<title>Pilot — Your AI crew, ready to fly</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
::selection{background:rgba(126,63,172,.4);color:#fff}
body{
  font-family:"Geist Sans","Geist",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  background:#0a0a14;color:#fff;min-height:100vh;
}
.dot-grid{
  position:fixed;inset:0;
  background-image:radial-gradient(circle,#333 1px,transparent 1px);
  background-size:24px 24px;opacity:.1;pointer-events:none;
}
.glow{
  position:fixed;inset:0;
  background:radial-gradient(ellipse at center top,rgba(126,63,172,.18) 0%,rgba(10,10,20,0) 60%);
  pointer-events:none;
}
nav{
  position:relative;z-index:2;
  display:flex;align-items:center;justify-content:space-between;
  padding:1.5rem 3rem;max-width:1200px;margin:0 auto;width:100%;
}
.nav-left{display:flex;align-items:center;gap:.75rem;}
.nav-left svg{border-radius:8px;}
.nav-brand{font-size:1.25rem;font-weight:600;letter-spacing:-.02em;}
.nav-right{display:flex;gap:2rem;}
.nav-right a{color:#a1a1aa;text-decoration:none;font-size:.875rem;transition:color .2s;}
.nav-right a:hover{color:#fff;}
.hero{
  position:relative;z-index:1;
  display:flex;flex-direction:column;align-items:center;
  padding:6rem 2rem 4rem;text-align:center;
}
.badge{
  display:inline-flex;align-items:center;gap:.5rem;
  padding:.5rem 1rem;border-radius:999px;
  background:rgba(126,63,172,.1);border:1px solid rgba(126,63,172,.2);
  font-family:"Geist Mono",monospace;font-size:.75rem;color:#a1a1aa;
  margin-bottom:2rem;
}
.badge-dot{width:8px;height:8px;border-radius:50%;background:#7e3fac;}
h1{
  font-size:clamp(2.5rem,6vw,4.5rem);font-weight:700;
  letter-spacing:-.03em;line-height:1.05;margin-bottom:1.5rem;
}
.subtitle{
  font-size:1.25rem;color:#a1a1aa;line-height:1.6;
  max-width:40rem;margin-bottom:2.5rem;
}
.install-box{
  display:flex;align-items:center;gap:1rem;
  padding:1rem 1.5rem;border-radius:.5rem;
  background:#111122;border:1px solid #2a2a3a;
  font-family:"Geist Mono",monospace;font-size:.9rem;
  margin-bottom:.75rem;
}
.install-box .dollar{color:#555577;}
.install-box code{color:#e0e0ff;white-space:nowrap;}
.copy-btn{
  padding:.5rem .75rem;border-radius:.375rem;
  background:#7e3fac;color:#fff;border:none;
  font-family:"Geist Sans",sans-serif;font-size:.8125rem;font-weight:500;
  cursor:pointer;transition:background .2s;
}
.copy-btn:hover{background:#9333ea;}
.alt-install{font-size:.8125rem;color:#555577;font-family:"Geist Mono",monospace;margin-bottom:1rem;}
.features{
  position:relative;z-index:1;
  display:grid;grid-template-columns:repeat(4,1fr);gap:1.5rem;
  max-width:1200px;margin:0 auto;padding:4rem 3rem;
}
.card{
  padding:1.5rem;border-radius:.75rem;
  background:#111122;border:1px solid #1a1a2e;
}
.card-icon{font-size:1.75rem;margin-bottom:.75rem;}
.card h3{font-size:1.125rem;font-weight:600;margin-bottom:.5rem;}
.card p{font-size:.875rem;color:#a1a1aa;line-height:1.5;}
footer{
  position:relative;z-index:1;
  max-width:1200px;margin:0 auto;padding:0 3rem 3rem;width:100%;
}
.footer-divider{height:1px;background:#1a1a2e;margin-bottom:1.5rem;}
.footer-inner{display:flex;justify-content:space-between;align-items:center;}
.footer-left{font-size:.8125rem;color:#555577;}
.socials{display:flex;gap:.75rem;}
.socials a{color:#555577;transition:color .2s;}
.socials a:hover{color:#a1a1aa;}
.socials svg{width:18px;height:18px;}
@media(max-width:768px){
  nav{padding:1rem 1.5rem;}
  .hero{padding:4rem 1.5rem 3rem;}
  .features{grid-template-columns:1fr;padding:2rem 1.5rem;}
  .install-box{flex-wrap:wrap;font-size:.8rem;}
  footer{padding:0 1.5rem 2rem;}
}
</style>
</head>
<body>
<div class="dot-grid"></div>
<div class="glow"></div>
<nav>
  <div class="nav-left">
    \${MEDAL_LOGO_SVG}
    <span class="nav-brand">Pilot</span>
  </div>
  <div class="nav-right">
    <a href="https://github.com/Medal-Social/pilot">GitHub</a>
    <a href="https://www.npmjs.com/package/@medalsocial/pilot">npm</a>
  </div>
</nav>
<section class="hero">
  <div class="badge"><span class="badge-dot"></span>Open Source &middot; Local-First &middot; Private by Design</div>
  <h1>Your AI crew,<br/>ready to fly.</h1>
  <p class="subtitle">One command gives you a full AI crew that knows your brand, creates content, and works across every AI tool you use.</p>
  <div class="install-box">
    <span class="dollar">$</span>
    <code id="cmd">curl -fsSL pilot.medalsocial.com/install | sh</code>
    <button class="copy-btn" onclick="navigator.clipboard.writeText(document.getElementById('cmd').textContent)">Copy</button>
  </div>
  <p class="alt-install">or npm install -g @medalsocial/pilot</p>
</section>
<section class="features">
  <div class="card">
    <div class="card-icon">&#x1f9e0;</div>
    <h3>Five AI Crew Leads</h3>
    <p>Brand, Marketing, Tech, CS, and Sales &mdash; each specialized in their domain.</p>
  </div>
  <div class="card">
    <div class="card-icon">&#x1f512;</div>
    <h3>Private by Design</h3>
    <p>Everything runs locally. Your data never leaves your machine unless you choose.</p>
  </div>
  <div class="card">
    <div class="card-icon">&#x1f50c;</div>
    <h3>Plugin System</h3>
    <p>Extend with official integrations &mdash; CMS, design tools, machine management.</p>
  </div>
  <div class="card">
    <div class="card-icon">&#x1f310;</div>
    <h3>Works Everywhere</h3>
    <p>Same crew in Pilot, Claude Code, Codex, or any MCP-aware AI tool.</p>
  </div>
</section>
<footer>
  <div class="footer-divider"></div>
  <div class="footer-inner">
    <span class="footer-left">&copy; 2026 Medal Social</span>
    <div class="socials">
      <a href="https://www.linkedin.com/company/medalsocial" aria-label="LinkedIn">\${LINKEDIN_SVG}</a>
      <a href="https://www.instagram.com/medalsocial" aria-label="Instagram">\${INSTAGRAM_SVG}</a>
      <a href="https://x.com/medalsocial" aria-label="X">\${X_SVG}</a>
    </div>
  </div>
</footer>
<script>
document.querySelector('.copy-btn').addEventListener('click',function(){
  this.textContent='Copied!';
  setTimeout(()=>this.textContent='Copy',2000);
});
</script>
</body>
</html>\`;

  return new Response(html, {
    headers: {
      "content-type": "text/html;charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/install") {
      return new Response(INSTALL_SCRIPT, {
        headers: {
          "content-type": "text/plain;charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    }

    return buildLandingPage();
  },
};
```

- [ ] **Step 5: Install dependencies**

Run: `cd workers/pilot-landing && npm install`

- [ ] **Step 6: Test locally**

Run: `cd workers/pilot-landing && npx wrangler dev`

Open `http://localhost:8787` → should show the landing page.
Open `http://localhost:8787/install` → should return the shell script.

- [ ] **Step 7: Commit**

```bash
git add workers/pilot-landing/
git commit -m "feat: add Cloudflare Worker for pilot.medalsocial.com landing page and install script"
```

---

### Task 2: Install Script (standalone file)

**Files:**
- Create: `scripts/install.sh`

The install script is embedded in the worker (Task 1), but also lives as a standalone file for direct download and testing.

- [ ] **Step 1: Create the install script**

Create `scripts/install.sh`:

```bash
#!/bin/sh
set -e

REPO="Medal-Social/pilot"
INSTALL_DIR="$HOME/.pilot/bin"

main() {
  echo "Checking your system..."

  OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH="$(uname -m)"

  case "$OS" in
    linux*)  OS="linux" ;;
    darwin*) OS="darwin" ;;
    mingw*|msys*|cygwin*)
      echo "For Windows, install via: npm install -g @medalsocial/pilot"
      echo "Or download from https://github.com/$REPO/releases"
      exit 0
      ;;
    *) echo "Unsupported operating system: $OS"; exit 1 ;;
  esac

  case "$ARCH" in
    x86_64|amd64) ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
  esac

  # Check for Node.js 24+
  if command -v node >/dev/null 2>&1; then
    NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
    if [ "$NODE_MAJOR" -ge 24 ] 2>/dev/null; then
      echo "Installing Pilot..."
      npm install -g @medalsocial/pilot
      echo ""
      echo "Pilot installed! Run \`pilot\` to get started."
      exit 0
    fi
  fi

  # Download standalone binary
  echo "Installing Pilot..."

  BINARY="pilot-$OS-$ARCH"
  URL="https://github.com/$REPO/releases/latest/download/$BINARY"

  mkdir -p "$INSTALL_DIR"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$URL" -o "$INSTALL_DIR/pilot"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$INSTALL_DIR/pilot" "$URL"
  else
    echo "Something went wrong. Visit https://github.com/$REPO for help."
    exit 1
  fi

  chmod +x "$INSTALL_DIR/pilot"

  # Add to PATH if not already there
  case ":$PATH:" in
    *":$INSTALL_DIR:"*) ;;
    *)
      SHELL_NAME="$(basename "$SHELL")"
      case "$SHELL_NAME" in
        zsh)  PROFILE="$HOME/.zshrc" ;;
        bash) PROFILE="$HOME/.bashrc" ;;
        *)    PROFILE="$HOME/.profile" ;;
      esac
      echo "" >> "$PROFILE"
      echo "# Pilot CLI" >> "$PROFILE"
      echo 'export PATH="$HOME/.pilot/bin:$PATH"' >> "$PROFILE"
      echo ""
      echo "Pilot installed! Restart your terminal, then run \`pilot\` to get started."
      exit 0
      ;;
  esac

  echo ""
  echo "Pilot installed! Run \`pilot\` to get started."
}

main
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x scripts/install.sh`

- [ ] **Step 3: Test locally**

Run: `sh scripts/install.sh`

Expected: If Node.js 24+ is present, it runs `npm install -g @medalsocial/pilot`. Otherwise it attempts binary download (which will 404 until binaries are built — that's expected).

- [ ] **Step 4: Commit**

```bash
git add scripts/install.sh
git commit -m "feat: add install script for curl-based Pilot installation"
```

---

### Task 3: Binary Build Pipeline (GitHub Actions)

**Files:**
- Create: `scripts/sea-config.json`
- Create: `.github/workflows/build-binaries.yml`

- [ ] **Step 1: Create SEA config**

Create `scripts/sea-config.json`:

```json
{
  "main": "build/index.js",
  "output": "sea-prep.blob",
  "disableExperimentalSEAWarning": true
}
```

- [ ] **Step 2: Create the build-binaries workflow**

Create `.github/workflows/build-binaries.yml`:

```yaml
name: Build Binaries

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            target_os: darwin
            target_arch: arm64
            binary_name: pilot-darwin-arm64
          - os: macos-latest
            target_os: darwin
            target_arch: x64
            binary_name: pilot-darwin-x64
          - os: ubuntu-latest
            target_os: linux
            target_arch: x64
            binary_name: pilot-linux-x64
          - os: windows-latest
            target_os: win
            target_arch: x64
            binary_name: pilot-win-x64.exe

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'

      - run: pnpm install --frozen-lockfile

      - name: Build CLI
        run: pnpm --filter @medalsocial/pilot build

      - name: Bundle with ncc
        run: npx @vercel/ncc build packages/cli/dist/bin/pilot.js -o build/ --minify

      - name: Generate SEA blob
        run: node --experimental-sea-config scripts/sea-config.json

      - name: Create binary (Unix)
        if: matrix.target_os != 'win'
        run: |
          cp $(which node) ${{ matrix.binary_name }}
          chmod 755 ${{ matrix.binary_name }}
          npx postject ${{ matrix.binary_name }} NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

      - name: Sign binary (macOS)
        if: matrix.target_os == 'darwin'
        run: |
          codesign --remove-signature ${{ matrix.binary_name }} || true
          codesign -s - ${{ matrix.binary_name }}

      - name: Create binary (Windows)
        if: matrix.target_os == 'win'
        shell: pwsh
        run: |
          Copy-Item (Get-Command node).Source ${{ matrix.binary_name }}
          npx postject ${{ matrix.binary_name }} NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

      - name: Upload binary to release
        uses: softprops/action-gh-release@v2
        with:
          files: ${{ matrix.binary_name }}
```

- [ ] **Step 3: Commit**

```bash
git add scripts/sea-config.json .github/workflows/build-binaries.yml
git commit -m "ci: add binary build pipeline using ncc + Node.js SEA"
```

---

### Task 4: Deploy Worker to Cloudflare

This is a manual deployment task with DNS setup.

- [ ] **Step 1: Deploy the worker**

Run from the repo root:

```bash
cd workers/pilot-landing
npx wrangler deploy
```

Expected: Worker deployed to `pilot-landing.<your-account>.workers.dev`

- [ ] **Step 2: Set up DNS**

In Cloudflare dashboard for `medalsocial.com`:

1. Go to **DNS → Records**
2. Add a CNAME record: `pilot` → `pilot-landing.<your-account>.workers.dev` (proxied)

Or use Workers custom domain:

1. Go to **Workers & Pages → pilot-landing → Settings → Triggers**
2. Add custom domain: `pilot.medalsocial.com`

- [ ] **Step 3: Update wrangler.toml with custom domain**

After DNS propagates, update `workers/pilot-landing/wrangler.toml`:

```toml
name = "pilot-landing"
main = "src/index.ts"
compatibility_date = "2026-04-10"

routes = [
  { pattern = "pilot.medalsocial.com", custom_domain = true }
]
```

- [ ] **Step 4: Verify**

Open `https://pilot.medalsocial.com` → should show the landing page.
Run: `curl -fsSL pilot.medalsocial.com/install | head -5` → should show the script header.

- [ ] **Step 5: Commit**

```bash
git add workers/pilot-landing/wrangler.toml
git commit -m "chore: add custom domain config for pilot.medalsocial.com"
```

---

### Task 5: Homebrew Tap

**Files:**
- Create: `homebrew-pilot/pilot.rb`
- Create: `homebrew-pilot/README.md`

This sets up a Homebrew tap so users can run `brew install Medal-Social/pilot/pilot`. The tap lives in the main repo under `homebrew-pilot/` and gets published as a separate GitHub repo `Medal-Social/homebrew-pilot`.

- [ ] **Step 1: Create the Homebrew formula**

Create `homebrew-pilot/pilot.rb`:

```ruby
class Pilot < Formula
  desc "Your AI crew, ready to fly. Medal Social's AI-powered CLI platform."
  homepage "https://github.com/Medal-Social/pilot"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/Medal-Social/pilot/releases/latest/download/pilot-darwin-arm64"
      sha256 "PLACEHOLDER_SHA256"

      def install
        bin.install "pilot-darwin-arm64" => "pilot"
      end
    else
      url "https://github.com/Medal-Social/pilot/releases/latest/download/pilot-darwin-x64"
      sha256 "PLACEHOLDER_SHA256"

      def install
        bin.install "pilot-darwin-x64" => "pilot"
      end
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/Medal-Social/pilot/releases/latest/download/pilot-linux-arm64"
      sha256 "PLACEHOLDER_SHA256"

      def install
        bin.install "pilot-linux-arm64" => "pilot"
      end
    else
      url "https://github.com/Medal-Social/pilot/releases/latest/download/pilot-linux-x64"
      sha256 "PLACEHOLDER_SHA256"

      def install
        bin.install "pilot-linux-x64" => "pilot"
      end
    end
  end

  test do
    assert_match "pilot", shell_output("#{bin}/pilot --version")
  end
end
```

Note: `PLACEHOLDER_SHA256` values must be updated after the first binary release by computing `shasum -a 256 <binary-file>` for each binary. This can be automated in the release workflow.

- [ ] **Step 2: Create the tap README**

Create `homebrew-pilot/README.md`:

```markdown
# Homebrew Tap for Pilot

Install Pilot via Homebrew:

```bash
brew install Medal-Social/pilot/pilot
```

Or add the tap first:

```bash
brew tap Medal-Social/pilot
brew install pilot
```

## About

Pilot is Medal Social's AI-powered CLI platform. Learn more at [github.com/Medal-Social/pilot](https://github.com/Medal-Social/pilot).
```

- [ ] **Step 3: Create the GitHub repo for the tap**

Run:

```bash
gh repo create Medal-Social/homebrew-pilot --public --description "Homebrew tap for Pilot CLI"
```

- [ ] **Step 4: Push the tap contents**

```bash
cd homebrew-pilot
git init
git add .
git commit -m "feat: add Homebrew formula for Pilot CLI"
git remote add origin https://github.com/Medal-Social/homebrew-pilot.git
git branch -M main
git push -u origin main
```

- [ ] **Step 5: Verify the tap works**

Run: `brew tap Medal-Social/pilot`

Expected: Tap is added successfully. `brew install pilot` won't work until binaries are published and SHA256 values are updated.

- [ ] **Step 6: Commit tap source to main repo**

```bash
cd /Users/ali/Documents/Code/pilot
git add homebrew-pilot/
git commit -m "feat: add Homebrew tap formula for Pilot CLI"
```

---

### Task 6: Verify End-to-End

- [ ] **Step 1: Tag a release to trigger binary builds**

After Tasks 1-3 are merged to main:

```bash
git tag v0.1.6
git push origin v0.1.6
```

This triggers both `release.yml` (npm publish) and `build-binaries.yml` (standalone binaries).

- [ ] **Step 2: Verify binaries are attached to the release**

Run: `gh release view v0.1.6`

Expected: 5 binary assets listed:
- `pilot-darwin-arm64`
- `pilot-darwin-x64`
- `pilot-linux-x64`
- `pilot-win-x64.exe`

(Linux arm64 may need a separate cross-compile runner — verify and fix if missing.)

- [ ] **Step 3: Test the install script via the worker**

Run on a machine without Node.js (or in a container):

```bash
curl -fsSL pilot.medalsocial.com/install | sh
```

Expected: Downloads the correct binary for the platform and installs to `~/.pilot/bin/pilot`.

- [ ] **Step 4: Test the install script with Node.js**

Run on a machine with Node.js 24+:

```bash
curl -fsSL pilot.medalsocial.com/install | sh
```

Expected: Runs `npm install -g @medalsocial/pilot` instead of downloading a binary.

- [ ] **Step 5: Update Homebrew formula SHA256 values**

After binaries are published, download each and compute SHA256:

```bash
curl -fsSL -o /tmp/pilot-darwin-arm64 https://github.com/Medal-Social/pilot/releases/latest/download/pilot-darwin-arm64
shasum -a 256 /tmp/pilot-darwin-arm64
```

Update the SHA256 values in `homebrew-pilot/pilot.rb` and push to the `Medal-Social/homebrew-pilot` repo.

- [ ] **Step 6: Test Homebrew install**

```bash
brew install Medal-Social/pilot/pilot
pilot --version
```

Expected: Pilot installs and runs successfully.
