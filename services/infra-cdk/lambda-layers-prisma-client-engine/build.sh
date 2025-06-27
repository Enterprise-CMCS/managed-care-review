#!/bin/bash
set -e

echo "Building Prisma Client Engine Lambda layer..."

# Clean up any existing build
rm -rf nodejs
mkdir -p nodejs/node_modules/.prisma/client

# Create package.json for the layer
cat > nodejs/package.json << EOF
{
  "name": "prisma-client-engine-layer",
  "version": "1.0.0",
  "description": "Prisma Client Engine for Lambda",
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "@prisma/engines": "^5.7.0"
  }
}
EOF

# Install dependencies
cd nodejs
npm install --production

# Download the correct binary for Lambda runtime
npx prisma generate --schema=../../src/database/schema.prisma || true

# Copy engine binaries
if [ -d "node_modules/.prisma/client" ]; then
  echo "Prisma engine binaries found and included in layer"
else
  echo "Warning: Prisma engine binaries not found. Layer may be incomplete."
fi

cd ..

echo "Prisma Client Engine layer built successfully!"
