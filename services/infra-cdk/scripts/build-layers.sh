#!/bin/bash

# Build all Lambda layers for Managed Care Review CDK

set -e

echo "Building Lambda layers..."

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CDK_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Build ClamAV layer
echo "Building ClamAV layer..."
cd "$CDK_DIR/lambda-layers-clamav"
if [ -f "build.sh" ]; then
    chmod +x build.sh
    ./build.sh
else
    echo "Warning: No build script found for ClamAV layer"
fi

# Build PostgreSQL tools layer
echo "Building PostgreSQL tools layer..."
cd "$CDK_DIR/lambda-layers-postgres-tools"
if [ -f "build.sh" ]; then
    chmod +x build.sh
    ./build.sh
else
    echo "Warning: No build script found for PostgreSQL tools layer"
fi

# Build Prisma client engine layer
echo "Building Prisma client engine layer..."
cd "$CDK_DIR/lambda-layers-prisma-client-engine"
if [ -f "build.sh" ]; then
    chmod +x build.sh
    ./build.sh
else
    # Create a basic build script if it doesn't exist
    cat > build.sh << 'EOF'
#!/bin/bash
rm -rf nodejs
mkdir -p nodejs/node_modules/@prisma/engines
cd nodejs
npm init -y
npm install @prisma/engines
# Copy the query engine binary
cp node_modules/@prisma/engines/libquery_engine-* .
EOF
    chmod +x build.sh
    ./build.sh
fi

# Build Prisma migration layer
echo "Building Prisma migration layer..."
cd "$CDK_DIR/lambda-layers-prisma-client-migration"
if [ -f "build.sh" ]; then
    chmod +x build.sh
    ./build.sh
else
    # Create a basic build script if it doesn't exist
    cat > build.sh << 'EOF'
#!/bin/bash
rm -rf nodejs
mkdir -p nodejs/node_modules/.prisma
cd nodejs
npm init -y
npm install @prisma/client prisma
# Copy migration engine
cp node_modules/prisma/libquery_engine-* .
cp node_modules/@prisma/engines/migration-engine-* .
EOF
    chmod +x build.sh
    ./build.sh
fi

echo "All Lambda layers built successfully!"
cd "$CDK_DIR"
