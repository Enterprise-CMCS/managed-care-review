#!/bin/bash
set -e

echo "Building PostgreSQL tools Lambda layer..."

# Clean up any existing build
rm -rf nodejs
mkdir -p nodejs/node_modules

# Create package.json for the layer
cat > nodejs/package.json << EOF
{
  "name": "postgres-tools-layer",
  "version": "1.0.0",
  "description": "PostgreSQL client tools for Lambda",
  "dependencies": {
    "pg": "^8.11.3",
    "pg-format": "^1.0.4",
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/client-secrets-manager": "^3.400.0",
    "@aws-sdk/client-sts": "^3.400.0",
    "@aws-sdk/lib-storage": "^3.400.0"
  }
}
EOF

# Install dependencies
cd nodejs
npm install --production
cd ..

# Create the layer structure
echo "PostgreSQL tools layer built successfully!"
