#!/bin/sh
# Reads version from package.json and writes src/version.ts
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION=$(node -p "require('$DIR/package.json').version")
cat > "$DIR/src/version.ts" << EOF
// Auto-generated at build time — do not edit manually
export const VERSION = '$VERSION';
EOF
