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

  # Fetch the latest version tag for pinned install
  if command -v curl >/dev/null 2>&1; then
    LATEST_VERSION="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed 's/.*"v\(.*\)".*/\1/')"
  elif command -v wget >/dev/null 2>&1; then
    LATEST_VERSION="$(wget -qO- "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed 's/.*"v\(.*\)".*/\1/')"
  fi

  # Check for Node.js 24+
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
    if [ "$NODE_MAJOR" -ge 24 ] 2>/dev/null; then
      echo "Installing Pilot..."
      if npm install -g "@medalsocial/pilot@${LATEST_VERSION:-latest}" 2>/dev/null; then
        echo ""
        echo "Pilot installed! Run \`pilot\` to get started."
        exit 0
      fi
      echo "npm install failed, falling back to binary download..."
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
