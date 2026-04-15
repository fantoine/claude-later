#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$ROOT/dist/later"

echo "Later — packaging .mcpb bundle"
echo ""

# 1. Build the MCP server
echo "→ Building MCP server..."
cd "$ROOT/../mcp-server"
npm install --silent
npm run build --silent
echo "  ✓ Build complete"

# 2. Prepare bundle directory
echo "→ Preparing bundle..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR/server"

# 3. Copy manifest and generate icon
cp "$ROOT/manifest.json" "$DIST_DIR/manifest.json"
if command -v rsvg-convert &> /dev/null; then
  rsvg-convert -w 512 -h 512 --background-color transparent "$ROOT/icon.svg" -o "$DIST_DIR/icon.png"
else
  echo "  ⚠ rsvg-convert not found (brew install librsvg), falling back to qlmanage..."
  qlmanage -t -s 512 -o "$ROOT" "$ROOT/icon.svg" > /dev/null 2>&1
  sips -z 512 512 "$ROOT/icon.svg.png" --out "$DIST_DIR/icon.png" > /dev/null 2>&1
  rm -f "$ROOT/icon.svg.png"
fi
echo "  ✓ Icon generated"

# 4. Copy self-contained bundle (esbuild, no deps needed)
VERSION=$(node -p "require('$ROOT/../mcp-server/package.json').version")
cp "$ROOT/../mcp-server/dist/index.js" "$DIST_DIR/server/"
echo "  ✓ Bundle ready (v$VERSION)"

# 6. Pack with mcpb
echo "→ Packing .mcpb..."
mkdir -p "$ROOT/dist"
if command -v mcpb &> /dev/null; then
  mcpb pack "$DIST_DIR" "$ROOT/dist/later.mcpb"
else
  echo "  ⚠ mcpb not found, falling back to zip..."
  cd "$DIST_DIR"
  zip -r "$ROOT/dist/later.mcpb" . -x "*.DS_Store"
  cd "$ROOT"
fi

echo ""
echo "✅ Done! → dist/later.mcpb"
echo ""
echo "Install: double-click dist/later.mcpb in Claude Desktop"
