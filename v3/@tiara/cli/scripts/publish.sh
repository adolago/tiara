#!/bin/bash
# Publish script for @tiara/cli
# Publishes to both @tiara/cli@alpha AND claude-flow@v3alpha

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"

cd "$CLI_DIR"

# Get current version
VERSION=$(node -p "require('./package.json').version")
echo "Publishing version: $VERSION"

# 1. Publish @tiara/cli with alpha tag
echo ""
echo "=== Publishing @tiara/cli@$VERSION (alpha tag) ==="
npm publish --tag alpha

# 2. Publish to claude-flow with v3alpha tag
echo ""
echo "=== Publishing claude-flow@$VERSION (v3alpha tag) ==="

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy necessary files
cp -r dist bin src package.json README.md "$TEMP_DIR/"

# Change package name to unscoped
cd "$TEMP_DIR"
sed -i 's/"name": "@tiara\/cli"/"name": "claude-flow"/' package.json

# Publish with v3alpha tag
npm publish --tag v3alpha

echo ""
echo "=== Published successfully ==="
echo "  @tiara/cli@$VERSION (alpha)"
echo "  claude-flow@$VERSION (v3alpha)"
echo ""
echo "Install with:"
echo "  npx @tiara/cli@alpha"
echo "  npx claude-flow@v3alpha"
