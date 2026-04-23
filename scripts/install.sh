#!/bin/sh
set -e

REPO="Medal-Social/Pilot"
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

  # Prefer npm install — always pulls the current "latest" dist-tag,
  # which is authoritative and independent of GitHub release tag naming.
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
    if [ "$NODE_MAJOR" -ge 24 ] 2>/dev/null; then
      echo "Installing Pilot..."
      if npm install -g "@medalsocial/pilot@latest"; then
        echo ""
        echo "Pilot installed! Run \`pilot\` to get started."
        echo "(zsh users: run \`rehash\` or open a new terminal if \`pilot\` isn't found yet.)"
        exit 0
      fi
      echo "npm install failed, falling back to binary download..."
    else
      echo "Node.js 24+ required for npm install, falling back to binary download..."
    fi
  fi

  # Fetch the latest release tag for the binary download fallback.
  # Supports both legacy "vX.Y.Z" and Changesets "@medalsocial/pilot@X.Y.Z" tag formats.
  if command -v curl >/dev/null 2>&1; then
    RAW_TAG="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | head -n 1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')"
  elif command -v wget >/dev/null 2>&1; then
    RAW_TAG="$(wget -qO- "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | head -n 1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')"
  fi
  # Strip either leading "v" or "@medalsocial/pilot@" prefix; fall back to raw tag.
  LATEST_VERSION="$(printf '%s' "$RAW_TAG" | sed -E 's|^v||; s|^@medalsocial/pilot@||')"

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
      # shellcheck disable=SC2016
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
