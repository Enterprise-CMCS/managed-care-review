#!/bin/bash

# Prisma Engine Layer for PostgreSQL only (runtime lambdas)
# This script creates a layer with Prisma Client for runtime use

set -e

echo "Building PostgreSQL-only engine layer..."

# Clean up existing layer
echo "Cleaning up any existing engine layer..."
rm -rf lambda-layers-prisma-client-engine

# Create layer structure
mkdir -p lambda-layers-prisma-client-engine/nodejs/node_modules
mkdir -p lambda-layers-prisma-client-engine/nodejs/prisma

echo "Installing Prisma Client dependencies..."

# Create a package.json for engine layer dependencies
cat > lambda-layers-prisma-client-engine/nodejs/package.json << 'EOF'
{
  "name": "prisma-engine-layer",
  "version": "1.0.0",
  "dependencies": {
    "@prisma/client": "^6.14.0"
  }
}
EOF

# Install Prisma Client in the layer (ignore workspace)
cd lambda-layers-prisma-client-engine/nodejs
pnpm install --prod --no-optional --ignore-workspace
cd ../..

echo "Stripping down to PostgreSQL runtime essentials only..."

# Keep only the essential Prisma Client structure
PRISMA_CLIENT_DIR="lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/client"

if [ ! -d "$PRISMA_CLIENT_DIR" ]; then
    echo "Error: @prisma/client was not installed properly"
    exit 1
fi

echo "Original Prisma Client size:"
du -sh "$PRISMA_CLIENT_DIR"

# Remove all non-PostgreSQL engine files (including base64 encoded ones)
find "$PRISMA_CLIENT_DIR" -name "*cockroachdb*" -delete 2>/dev/null || true
find "$PRISMA_CLIENT_DIR" -name "*sqlserver*" -delete 2>/dev/null || true
find "$PRISMA_CLIENT_DIR" -name "*sqlite*" -delete 2>/dev/null || true
find "$PRISMA_CLIENT_DIR" -name "*mysql*" -delete 2>/dev/null || true
find "$PRISMA_CLIENT_DIR" -name "*mongodb*" -delete 2>/dev/null || true

# Remove non-PostgreSQL base64 WASM files specifically
rm -f "$PRISMA_CLIENT_DIR"/runtime/*cockroachdb* 2>/dev/null || true
rm -f "$PRISMA_CLIENT_DIR"/runtime/*sqlserver* 2>/dev/null || true
rm -f "$PRISMA_CLIENT_DIR"/runtime/*sqlite* 2>/dev/null || true
rm -f "$PRISMA_CLIENT_DIR"/runtime/*mysql* 2>/dev/null || true
rm -f "$PRISMA_CLIENT_DIR"/runtime/*mongodb* 2>/dev/null || true

# Remove non-Linux platform binaries
find "$PRISMA_CLIENT_DIR" -name "*darwin*" -delete 2>/dev/null || true
find "$PRISMA_CLIENT_DIR" -name "*windows*" -delete 2>/dev/null || true
find "$PRISMA_CLIENT_DIR" -name "*debian*" -delete 2>/dev/null || true

# Remove development files
find "$PRISMA_CLIENT_DIR" -name "*.map" -delete 2>/dev/null || true
find "$PRISMA_CLIENT_DIR" -name "*.ts" -delete 2>/dev/null || true
find "$PRISMA_CLIENT_DIR" -name ".DS_Store" -delete 2>/dev/null || true

echo "After aggressive stripping:"
du -sh "$PRISMA_CLIENT_DIR"

echo "Copying schema files..."

# Copy Prisma schema (needed for runtime)
rsync -av prisma/schema.prisma lambda-layers-prisma-client-engine/nodejs/prisma/

echo "Final cleanup..."

# Remove package files from layer root (not needed at runtime)
rm lambda-layers-prisma-client-engine/nodejs/package.json
rm lambda-layers-prisma-client-engine/nodejs/package-lock.json 2>/dev/null || true
rm lambda-layers-prisma-client-engine/nodejs/pnpm-lock.yaml 2>/dev/null || true

echo "Checking final size..."
du -sh lambda-layers-prisma-client-engine/

echo "Contents of engine layer:"
ls -la lambda-layers-prisma-client-engine/nodejs/

echo "Prisma Client size after stripping:"
du -sh lambda-layers-prisma-client-engine/nodejs/node_modules/@prisma/client/

echo "Engine layer built successfully!"