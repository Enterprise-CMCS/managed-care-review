#!/bin/bash

# Prisma Migration Layer for PostgreSQL only
# This script creates a layer with just what's needed for migrations

set -e

echo "Building PostgreSQL-only migration layer..."

# Clean up existing layer
echo "Cleaning up any existing layer..."
rm -rf lambda-layers-prisma-migration

# Create layer structure
mkdir -p lambda-layers-prisma-migration/nodejs/node_modules
mkdir -p lambda-layers-prisma-migration/nodejs/prisma
mkdir -p lambda-layers-prisma-migration/nodejs/dataMigrations

echo "Installing Prisma CLI in temporary location..."

# Create a package.json for just what we need
cat > lambda-layers-prisma-migration/nodejs/package.json << 'EOF'
{
  "name": "prisma-migration-layer",
  "version": "1.0.0",
  "dependencies": {
    "prisma": "^6.14.0"
  }
}
EOF

# Install prisma CLI in the layer (ignore workspace)
cd lambda-layers-prisma-migration/nodejs
pnpm install --prod --no-optional --ignore-workspace
cd ../..

echo "Removing unnecessary transitive dependencies..."

# Remove Effect package 
echo "Removing Effect package..."
rm -rf lambda-layers-prisma-migration/nodejs/node_modules/.pnpm/effect@*
find lambda-layers-prisma-migration/nodejs/node_modules -name "effect" -type l -delete 2>/dev/null || true

# Remove fast-check package 
echo "Removing fast-check package..."
rm -rf lambda-layers-prisma-migration/nodejs/node_modules/.pnpm/fast-check@*
find lambda-layers-prisma-migration/nodejs/node_modules -name "fast-check" -type l -delete 2>/dev/null || true

# Remove other development/testing dependencies not needed for migrations
rm -rf lambda-layers-prisma-migration/nodejs/node_modules/.pnpm/*test* 2>/dev/null || true
rm -rf lambda-layers-prisma-migration/nodejs/node_modules/.pnpm/*benchmark* 2>/dev/null || true

echo "Stripping down to PostgreSQL migration essentials only..."

# Keep only the essential Prisma CLI structure
PRISMA_DIR="lambda-layers-prisma-migration/nodejs/node_modules/prisma"

echo "Original Prisma CLI size:"
du -sh "$PRISMA_DIR"

# Remove the entire prisma-client runtime (16MB) - not needed for migrations
rm -rf "$PRISMA_DIR"/prisma-client

# Remove ALL query engines - we only need schema engine for migrations
find "$PRISMA_DIR" -name "*query_engine*" -delete 2>/dev/null || true
find "$PRISMA_DIR" -name "libquery_engine*" -delete 2>/dev/null || true

# Remove all non-PostgreSQL schema engine files 
find "$PRISMA_DIR" -name "*cockroachdb*" -delete 2>/dev/null || true
find "$PRISMA_DIR" -name "*sqlserver*" -delete 2>/dev/null || true
find "$PRISMA_DIR" -name "*sqlite*" -delete 2>/dev/null || true
find "$PRISMA_DIR" -name "*mysql*" -delete 2>/dev/null || true
find "$PRISMA_DIR" -name "*mongodb*" -delete 2>/dev/null || true

# Keep only PostgreSQL schema engine WASM files
find "$PRISMA_DIR" -name "*.wasm" ! -name "*schema_engine*postgresql*" -delete 2>/dev/null || true

# Remove non-Linux platform binaries
find "$PRISMA_DIR" -name "*darwin*" -delete 2>/dev/null || true
find "$PRISMA_DIR" -name "*windows*" -delete 2>/dev/null || true
find "$PRISMA_DIR" -name "*debian*" -delete 2>/dev/null || true

# Remove unnecessary directories and files
rm -rf "$PRISMA_DIR"/.github 2>/dev/null || true
rm -rf "$PRISMA_DIR"/build/public 2>/dev/null || true
rm -rf "$PRISMA_DIR"/preinstall 2>/dev/null || true

# Remove JavaScript/TypeScript source maps and other dev files
find "$PRISMA_DIR" -name "*.map" -delete 2>/dev/null || true
find "$PRISMA_DIR" -name "*.ts" -delete 2>/dev/null || true
find "$PRISMA_DIR" -name ".DS_Store" -delete 2>/dev/null || true

# Keep only essential CLI files - remove everything in build except what we need for migrations
if [ -d "$PRISMA_DIR"/build ]; then
    # Keep only PostgreSQL-specific files and core CLI
    find "$PRISMA_DIR"/build -type f ! -name "*postgresql*" ! -name "index.js" ! -name "cli*" ! -name "child.js" -delete 2>/dev/null || true
fi

# Remove any remaining large files that aren't needed for migrations
# Keep only schema engine files for PostgreSQL
find "$PRISMA_DIR" -size +1M -name "*.wasm" ! -name "*schema_engine*postgresql*" -delete 2>/dev/null || true
find "$PRISMA_DIR" -size +1M -name "*.node" ! -name "*schema_engine*postgresql*" -delete 2>/dev/null || true

# Remove documentation and other non-essential files  
rm -rf "$PRISMA_DIR"/README.md 2>/dev/null || true
rm -rf "$PRISMA_DIR"/LICENSE 2>/dev/null || true
rm -rf "$PRISMA_DIR"/docs 2>/dev/null || true

echo "After aggressive stripping:"
du -sh "$PRISMA_DIR"

# Show what schema engine files we kept
echo "Schema engine files remaining:"
find "$PRISMA_DIR" -name "*schema_engine*" 2>/dev/null || echo "None found"
echo "All remaining large files:"
find "$PRISMA_DIR" -size +1M 2>/dev/null || echo "None found"

echo "Copying schema and migration files..."

# Copy Prisma schema
rsync -av prisma/ lambda-layers-prisma-migration/nodejs/prisma/

# Copy data migration scripts (compiled TypeScript)
if [ -d ".esbuild/.build/src/dataMigrations" ]; then
    rsync -av .esbuild/.build/src/dataMigrations/ lambda-layers-prisma-migration/nodejs/dataMigrations/
else
    echo "Warning: .esbuild/.build/src/dataMigrations not found. Run build first if you have data migrations."
fi

# Copy proto migration files if they exist
if [ -d "../app-proto/gen" ]; then
    mkdir -p lambda-layers-prisma-migration/nodejs/gen
    rsync -av ../app-proto/gen/ lambda-layers-prisma-migration/nodejs/gen/
fi

# No additional dependencies needed for migrations

echo "Final cleanup..."

# Remove package files from layer root (not needed at runtime)
rm lambda-layers-prisma-migration/nodejs/package.json
rm lambda-layers-prisma-migration/nodejs/package-lock.json 2>/dev/null || true
rm lambda-layers-prisma-migration/nodejs/pnpm-lock.yaml 2>/dev/null || true

echo "Compressing migration layer..."
pushd lambda-layers-prisma-migration && tar -zcf /tmp/nodejs.tar.gz . && mv /tmp/nodejs.tar.gz ./nodejs.tar.gz
rm -rf nodejs
ls -lh nodejs.tar.gz
popd

echo "Migration layer compressed successfully!"
ls -lh lambda-layers-prisma-migration/nodejs.tar.gz