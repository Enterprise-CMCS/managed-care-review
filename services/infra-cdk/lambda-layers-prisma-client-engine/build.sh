#!/bin/bash
set -e

echo "Building Prisma Client Engine Lambda layer..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../../.."
APP_API_DIR="$PROJECT_ROOT/services/app-api"

# Clean up any existing build
rm -rf nodejs
rm -f nodejs.tar.gz

# Create layer structure
mkdir -p nodejs/node_modules/.prisma
mkdir -p nodejs/node_modules/@prisma/engines
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

# Copy additional Prisma dependencies (lighter subset than migration layer)
rsync -av "$PROJECT_ROOT/node_modules/.pnpm/node_modules/@prisma/engines/dist/" nodejs/node_modules/@prisma/engines/dist/ || true
rsync -av "$PROJECT_ROOT/node_modules/.pnpm/node_modules/@prisma/debug/" nodejs/node_modules/@prisma/debug/ || true
rsync -av "$PROJECT_ROOT/node_modules/.pnpm/node_modules/@prisma/engines-version/" nodejs/node_modules/@prisma/engines-version/ || true
rsync -av "$PROJECT_ROOT/node_modules/.pnpm/node_modules/@prisma/fetch-engine/" nodejs/node_modules/@prisma/fetch-engine/ || true
rsync -av "$PROJECT_ROOT/node_modules/.pnpm/node_modules/@prisma/get-platform/" nodejs/node_modules/@prisma/get-platform/ || true

# Copy schema files
echo "Copying schema files..."
rsync -av "$APP_API_DIR/prisma/" nodejs/prisma/

# Remove Prisma CLI to save space
rm -rf nodejs/node_modules/@prisma/cli

# Remove non-RHEL binaries to save space
echo "Removing non-RHEL binaries..."
find nodejs/node_modules/.prisma/client -type f ! -name "*rhel-openssl-3.0.x*" -name "*.node" -delete 2>/dev/null || true
find nodejs/node_modules/prisma -type f ! -name "*rhel-openssl-3.0.x*" -name "*.node" -delete 2>/dev/null || true
rm -rf nodejs/node_modules/prisma/engines

# Remove debian binaries
rm -f nodejs/node_modules/.prisma/client/libquery_engine-debian-openssl-*.so.node
rm -f nodejs/node_modules/prisma/libquery_engine-debian-openssl-*.so.node
rm -f nodejs/node_modules/@prisma/*debian*

# Compress the layer (optional, but matches serverless approach)
echo "Compressing layer..."
tar -zcf nodejs.tar.gz nodejs/

# Show final size
echo "Layer size: $(du -sh nodejs.tar.gz | cut -f1)"
echo "Prisma Client Engine layer built successfully!"
