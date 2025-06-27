#!/bin/bash
set -e

echo "Building Prisma Migration Lambda layer..."

# Clean up any existing build
rm -rf nodejs
mkdir -p nodejs/node_modules

# Create package.json for the layer
cat > nodejs/package.json << EOF
{
  "name": "prisma-migration-layer",
  "version": "1.0.0",
  "description": "Prisma Migration tools for Lambda",
  "dependencies": {
    "@prisma/migrate": "^5.7.0",
    "@prisma/client": "^5.7.0"
  }
}
EOF

# Install dependencies
cd nodejs
npm install --production

# Include migration scripts if they exist
if [ -d "../../src/database/migrations" ]; then
  cp -r ../../src/database/migrations ./
  echo "Migration scripts included in layer"
fi

cd ..

echo "Prisma Migration layer built successfully!"
