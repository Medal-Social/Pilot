const INSTALL_SCRIPT = `#!/usr/bin/env sh
set -e

# Pilot CLI installer
# https://pilot.medalsocial.com

PILOT_VERSION="latest"
INSTALL_DIR="$HOME/.pilot/bin"
BIN_NAME="pilot"

info()    { printf "  \\033[34m→\\033[0m %s\\n" "$1"; }
success() { printf "  \\033[32m✓\\033[0m %s\\n" "$1"; }
error()   { printf "  \\033[31m✗\\033[0m %s\\n" "$1" >&2; exit 1; }

# Detect OS
detect_os() {
  case "$(uname -s)" in
    Darwin)  echo "darwin" ;;
    Linux)   echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*) echo "win" ;;

    *) error "Unsupported operating system: $(uname -s)" ;;
  esac
}

# Detect architecture
detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64) echo "x64" ;;
    arm64|aarch64) echo "arm64" ;;
    *) error "Unsupported architecture: $(uname -m)" ;;
  esac
}

# Check if Node.js 24+ is available
check_node() {
  if command -v node >/dev/null 2>&1; then
    NODE_MAJOR=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 24 ] 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

# Add install dir to PATH in shell profile
add_to_path() {
  SHELL_NAME="$(basename "$SHELL")"
  case "$SHELL_NAME" in
    zsh)   PROFILE="$HOME/.zshrc" ;;
    bash)  PROFILE="$HOME/.bashrc" ;;
    fish)  PROFILE="$HOME/.config/fish/config.fish" ;;
    *)     PROFILE="$HOME/.profile" ;;
  esac

  PATH_LINE="export PATH=\\"$INSTALL_DIR:\$PATH\\""
  if [ "$SHELL_NAME" = "fish" ]; then
    PATH_LINE="fish_add_path \\"$INSTALL_DIR\\""
  fi

  if ! grep -qF "$INSTALL_DIR" "$PROFILE" 2>/dev/null; then
    printf "\\n# Pilot CLI\\n%s\\n" "$PATH_LINE" >> "$PROFILE"
    info "Added Pilot to your PATH in $PROFILE"
    info "Run: source $PROFILE  (or open a new terminal)"
  fi
}

printf "\\n  \\033[35m◆\\033[0m Pilot CLI — by Medal Social\\n\\n"

OS=$(detect_os)
ARCH=$(detect_arch)

if check_node && command -v npm >/dev/null 2>&1; then
  info "Installing via npm..."
  if npm install -g @medalsocial/pilot 2>/dev/null; then
    success "Pilot installed successfully!"
    printf "\\n  Run \\033[36mpilot\\033[0m to get started.\\n\\n"
    exit 0
  fi
  info "npm install failed, falling back to binary download..."
fi

# Binary install fallback
BINARY_NAME="pilot-$OS-$ARCH"
if [ "$OS" = "win" ]; then
  BINARY_NAME="$BINARY_NAME.exe"
  BIN_NAME="pilot.exe"
fi

DOWNLOAD_URL="https://github.com/Medal-Social/pilot/releases/latest/download/$BINARY_NAME"

info "Setting up your crew..."
mkdir -p "$INSTALL_DIR"

info "Downloading Pilot..."
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$DOWNLOAD_URL" -o "$INSTALL_DIR/$BIN_NAME"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$INSTALL_DIR/$BIN_NAME" "$DOWNLOAD_URL"
else
  error "curl or wget is required to install Pilot"
fi

chmod +x "$INSTALL_DIR/$BIN_NAME"

add_to_path

success "Pilot is ready for takeoff!"
printf "\\n  Run \\033[36mpilot\\033[0m to get started.\\n\\n"
`;

const MEDAL_LOGO_SVG = `<svg width="40" height="40" viewBox="0 0 300 300" fill="none" aria-hidden="true">
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
</svg>`;

const LINKEDIN_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
</svg>`;

const INSTAGRAM_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
</svg>`;

const YOUTUBE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
</svg>`;

const X_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.905-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
</svg>`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildLandingPage(): Response {
  const INSTALL_COMMAND = 'curl -fsSL https://pilot.medalsocial.com/install | sh';
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pilot — Your AI crew, ready to fly</title>
  <meta name="description" content="Medal Social's AI-powered CLI. Five AI crew leads for brand, marketing, tech, support, and sales. Open source, local-first, private by design." />
  <meta property="og:title" content="Pilot — Your AI crew, ready to fly" />
  <meta property="og:description" content="Medal Social's AI-powered CLI. Five AI crew leads, private by design." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://pilot.medalsocial.com" />
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-sans/style.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/geist@1/dist/fonts/geist-mono/style.min.css" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0a0a14;
      --card-bg: #111122;
      --border: #1a1a2e;
      --border-alt: #2a2a3a;
      --accent: #7e3fac;
      --accent-hover: #9333ea;
      --text: #ffffff;
      --text-secondary: #a1a1aa;
      --text-muted: #555577;
      --font-sans: 'Geist Sans', system-ui, -apple-system, sans-serif;
      --font-mono: 'Geist Mono', 'Fira Code', monospace;
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: var(--font-sans);
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* Dot grid background */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image: radial-gradient(circle, #333 1px, transparent 1px);
      background-size: 24px 24px;
      opacity: 0.1;
      pointer-events: none;
      z-index: 0;
    }

    /* Purple radial glow from top center */
    body::after {
      content: '';
      position: fixed;
      top: -20%;
      left: 50%;
      transform: translateX(-50%);
      width: 900px;
      height: 700px;
      background: radial-gradient(ellipse at center, rgba(126,63,172,.18) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    .page-wrap {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* ── Nav ── */
    nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 40px;
      border-bottom: 1px solid var(--border);
      backdrop-filter: blur(8px);
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(10, 10, 20, 0.8);
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }

    .nav-brand-logo {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .nav-brand-name {
      font-size: 18px;
      font-weight: 600;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    .nav-brand-divider {
      width: 1px;
      height: 20px;
      background: var(--border-alt);
      margin: 0 4px;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 500;
      transition: color 0.15s, background 0.15s;
    }

    .nav-link:hover {
      color: var(--text);
      background: rgba(255,255,255,0.06);
    }

    /* ── Main ── */
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px 24px 60px;
    }

    /* ── Hero ── */
    .hero {
      max-width: 700px;
      width: 100%;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid rgba(126,63,172,.4);
      background: rgba(126,63,172,.08);
      color: #c084fc;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.01em;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent);
      flex-shrink: 0;
    }

    h1 {
      font-size: clamp(36px, 6vw, 60px);
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.1;
      color: var(--text);
    }

    .subtitle {
      font-size: 18px;
      color: var(--text-secondary);
      line-height: 1.6;
      max-width: 520px;
    }

    /* Install box */
    .install-box {
      width: 100%;
      max-width: 560px;
      background: var(--card-bg);
      border: 1px solid var(--border-alt);
      border-radius: 12px;
      overflow: hidden;
    }

    .install-box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
    }

    .install-box-dots {
      display: flex;
      gap: 6px;
    }

    .install-box-dots span {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--border-alt);
    }

    .install-box-label {
      font-size: 12px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    .install-box-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      gap: 12px;
    }

    .install-command {
      font-family: var(--font-mono);
      font-size: 14px;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .copy-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--border-alt);
      background: rgba(255,255,255,0.04);
      color: var(--text-secondary);
      font-size: 13px;
      font-family: var(--font-sans);
      font-weight: 500;
      cursor: pointer;
      transition: color 0.15s, background 0.15s, border-color 0.15s;
      white-space: nowrap;
    }

    .copy-btn:hover {
      color: var(--text);
      background: rgba(255,255,255,0.08);
      border-color: var(--border-alt);
    }

    .copy-btn.copied {
      color: #4ade80;
      border-color: rgba(74,222,128,.3);
      background: rgba(74,222,128,.06);
    }

    .npm-fallback {
      font-size: 13px;
      color: var(--text-muted);
    }

    .npm-fallback code {
      font-family: var(--font-mono);
      color: var(--text-secondary);
      background: rgba(255,255,255,0.05);
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* ── Features ── */
    .features {
      margin-top: 80px;
      width: 100%;
      max-width: 900px;
    }

    .features-heading {
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 32px;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .feature-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.2s;
    }

    .feature-card:hover {
      border-color: rgba(126,63,172,.4);
    }

    .feature-icon {
      font-size: 22px;
      line-height: 1;
    }

    .feature-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text);
      letter-spacing: -0.01em;
    }

    .feature-desc {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    /* ── Footer ── */
    footer {
      border-top: 1px solid var(--border);
      padding: 24px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      position: relative;
      z-index: 1;
    }

    .footer-copy {
      font-size: 13px;
      color: var(--text-muted);
    }

    .footer-copy a {
      color: var(--text-secondary);
      text-decoration: none;
    }

    .footer-copy a:hover {
      color: var(--text);
    }

    .footer-socials {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .social-link {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.15s, background 0.15s;
    }

    .social-link:hover {
      color: var(--text);
      background: rgba(255,255,255,0.06);
    }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      nav {
        padding: 16px 20px;
      }

      .nav-links .nav-link span {
        display: none;
      }

      main {
        padding: 56px 20px 48px;
      }

      .feature-grid {
        grid-template-columns: 1fr;
      }

      footer {
        padding: 20px;
        flex-direction: column;
        align-items: flex-start;
      }

      .install-command {
        font-size: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="page-wrap">
    <nav>
      <a href="/" class="nav-brand">
        <span class="nav-brand-logo">${MEDAL_LOGO_SVG}</span>
        <span class="nav-brand-divider"></span>
        <span class="nav-brand-name">Pilot</span>
      </a>
      <div class="nav-links">
        <a href="https://github.com/Medal-Social/pilot" class="nav-link" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          <span>GitHub</span>
        </a>
        <a href="https://www.npmjs.com/package/@medalsocial/pilot" class="nav-link" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474C23.214 24 24 23.214 24 22.237V1.763C24 .786 23.214 0 22.237 0H1.763zm9.842 5.05h5.21v13.9h-2.605V7.655H11.61v11.295H9.005V5.05H5.45v13.9H2.845V5.05h8.76z"/></svg>
          <span>npm</span>
        </a>
      </div>
    </nav>

    <main>
      <section class="hero">
        <div class="badge">
          <span class="badge-dot"></span>
          Open Source · Local-First · Private by Design
        </div>

        <h1>Your AI crew,<br/>ready to fly.</h1>

        <p class="subtitle">
          Five AI crew leads for brand, marketing, tech, support, and sales —
          all running locally via Claude, right in your terminal.
        </p>

        <div class="install-box">
          <div class="install-box-header">
            <div class="install-box-dots">
              <span></span><span></span><span></span>
            </div>
            <span class="install-box-label">install</span>
            <div style="width:48px"></div>
          </div>
          <div class="install-box-body">
            <span class="install-command" id="install-cmd">${escapeHtml(INSTALL_COMMAND)}</span>
            <button class="copy-btn" id="copy-btn" onclick="copyInstall()" aria-label="Copy install command">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
              </svg>
              <span id="copy-label">Copy</span>
            </button>
          </div>
        </div>

        <p class="npm-fallback">
          or <code>npm install -g @medalsocial/pilot</code>
        </p>
      </section>

      <section class="features">
        <p class="features-heading">Everything you need</p>
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">✦</div>
            <div class="feature-title">Five AI Crew Leads</div>
            <p class="feature-desc">Brand, Marketing, Tech, Support, and Sales specialists — each with deep context about your company, ready to collaborate or work autonomously.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">⬡</div>
            <div class="feature-title">Private by Design</div>
            <p class="feature-desc">Your data never leaves your machine. Skills and context live in <code style="font-family:var(--font-mono);font-size:13px;background:rgba(255,255,255,.05);padding:2px 5px;border-radius:4px;">~/.pilot</code>, not some third-party cloud.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">◈</div>
            <div class="feature-title">Plugin System</div>
            <p class="feature-desc">First-class plugins for Sanity CMS, Pencil design tools, and machine management via Kit — with more on the way.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">◎</div>
            <div class="feature-title">Works Everywhere</div>
            <p class="feature-desc">macOS and Linux, x64 and ARM. A single <code style="font-family:var(--font-mono);font-size:13px;background:rgba(255,255,255,.05);padding:2px 5px;border-radius:4px;">pilot up</code> command gets your whole crew airborne.</p>
          </div>
        </div>
      </section>
    </main>

    <footer>
      <p class="footer-copy">
        &copy; ${year} <a href="https://medal.tv" target="_blank" rel="noopener">Medal Social</a>. Open source under MIT.
      </p>
      <div class="footer-socials">
        <a href="https://www.linkedin.com/company/medalsocial/" class="social-link" target="_blank" rel="noopener" aria-label="LinkedIn">
          ${LINKEDIN_ICON}
        </a>
        <a href="https://www.instagram.com/medalsocial/" class="social-link" target="_blank" rel="noopener" aria-label="Instagram">
          ${INSTAGRAM_ICON}
        </a>
        <a href="https://www.youtube.com/@MedalSocial" class="social-link" target="_blank" rel="noopener" aria-label="YouTube">
          ${YOUTUBE_ICON}
        </a>
        <a href="https://x.com/medalsocial" class="social-link" target="_blank" rel="noopener" aria-label="X (Twitter)">
          ${X_ICON}
        </a>
      </div>
    </footer>
  </div>

  <script>
    var INSTALL_CMD = ${JSON.stringify(INSTALL_COMMAND)};
    function copyInstall() {
      var cmd = INSTALL_CMD;
      const btn = document.getElementById('copy-btn');
      const label = document.getElementById('copy-label');

      navigator.clipboard.writeText(cmd).then(function() {
        btn.classList.add('copied');
        label.textContent = 'Copied!';
        setTimeout(function() {
          btn.classList.remove('copied');
          label.textContent = 'Copy';
        }, 2000);
      }).catch(function() {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = cmd;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btn.classList.add('copied');
        label.textContent = 'Copied!';
        setTimeout(function() {
          btn.classList.remove('copied');
          label.textContent = 'Copy';
        }, 2000);
      });
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Content-Security-Policy':
        "default-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net; script-src 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/install') {
      return new Response(INSTALL_SCRIPT, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'Content-Disposition': 'inline',
        },
      });
    }

    return buildLandingPage();
  },
} satisfies ExportedHandler;
