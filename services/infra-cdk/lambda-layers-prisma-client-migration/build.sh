#!/bin/bash
set -e

echo "Building Prisma Client Migration Lambda layer..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../../.."
APP_API_DIR="$PROJECT_ROOT/services/app-api"

# Clean up any existing build
rm -rf nodejs
rm -f nodejs.tar.gz

# Create layer structure
mkdir -p nodejs/node_modules/.prisma
mkdir -p nodejs/node_modules/@prisma
mkdir -p nodejs/node_modules/prisma
mkdir -p nodejs/prisma

# Navigate to app-api directory to run prisma generate
cd "$APP_API_DIR"

echo "Generating RHEL Prisma client..."
PRISMA_CLI_BINARY_TARGETS=rhel-openssl-3.0.x pnpm exec prisma generate

# Navigate back to layer directory
cd "$SCRIPT_DIR"

echo "Copying Prisma client files..."
# Copy generated Prisma client
rsync -av "$APP_API_DIR/node_modules/@prisma/client/" nodejs/node_modules/@prisma/client/
rsync -av "$APP_API_DIR/node_modules/prisma/" nodejs/node_modules/prisma/

# Find the current prisma client version path dynamically in pnpm
PRISMA_CLIENT_PATH=$(find "$PROJECT_ROOT/node_modules/.pnpm" -name "@prisma+client@*" -type d | head -1)
if [ -n "$PRISMA_CLIENT_PATH" ]; then
    echo "Found Prisma client path: $PRISMA_CLIENT_PATH"
    rsync -av "$PRISMA_CLIENT_PATH/node_modules/.prisma/" nodejs/node_modules/.prisma/
else
    echo "ERROR: Could not find Prisma client path in .pnpm"
    exit 1
fi

# Copy ALL Prisma dependencies for migrations (including heavy engines)
echo "Copying full Prisma ecosystem for migrations..."
rsync -avL "$PROJECT_ROOT/node_modules/.pnpm/node_modules/@prisma/" nodejs/node_modules/@prisma/ || true

# Copy specific pg module for node-pg-migrate
echo "Copying pg module..."
# First try to find pg in .pnpm store
PG_PATH=$(find "$PROJECT_ROOT/node_modules/.pnpm" -name "pg@*" -type d | grep -v "node_modules/pg" | head -1)
if [ -n "$PG_PATH" ]; then
    echo "Found pg module at: $PG_PATH"
    mkdir -p nodejs/node_modules/pg
    rsync -av "$PG_PATH/node_modules/pg/" nodejs/node_modules/pg/
else
    # Fallback to app-api node_modules
    if [ -d "$APP_API_DIR/node_modules/pg" ]; then
        rsync -av "$APP_API_DIR/node_modules/pg/" nodejs/node_modules/pg/
    else
        echo "WARNING: Could not find pg module"
    fi
fi

# Copy schema files
echo "Copying schema files..."
rsync -av "$APP_API_DIR/prisma/" nodejs/prisma/

# Remove non-RHEL binaries to save space
echo "Removing non-RHEL binaries..."
find nodejs/node_modules/.prisma/client -type f ! -name "*rhel-openssl-3.0.x*" -name "*.node" -delete 2>/dev/null || true
find nodejs/node_modules/prisma -type f ! -name "*rhel-openssl-3.0.x*" -name "*.node" -delete 2>/dev/null || true

# Remove debian binaries
rm -f nodejs/node_modules/.prisma/client/libquery_engine-debian-openssl-*.so.node
rm -f nodejs/node_modules/prisma/libquery_engine-debian-openssl-*.so.node
rm -f nodejs/node_modules/@prisma/*debian*

# Compress the layer (optional, but matches serverless approach)
echo "Compressing layer..."
tar -zcf nodejs.tar.gz nodejs/

# Show final size
echo "Layer size: $(du -sh nodejs.tar.gz | cut -f1)"
echo "Prisma Client Migration layer built successfully!"