#!/bin/bash
set -e

# Build optimized Lambda layers with aggressive size reduction
# Ensures layers stay under 50MB to prevent deployment failures

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INFRA_CDK_DIR="$SCRIPT_DIR/.."
PROJECT_ROOT="$SCRIPT_DIR/../../.."
APP_API_DIR="$PROJECT_ROOT/services/app-api"

# Layer type to build (engine, migration, postgres-tools)
LAYER_TYPE="${1:-}"
if [ -z "$LAYER_TYPE" ]; then
    echo "Usage: $0 <layer_type>"
    echo "layer_type: engine, migration, postgres-tools"
    exit 1
fi

echo "🔨 Building optimized Lambda layer: $LAYER_TYPE"

# Function to check layer size and fail if over limit
check_layer_size() {
    local layer_dir="$1"
    local max_size_mb=50
    
    if [ -d "$layer_dir" ]; then
        # Calculate size in MB
        local size_bytes=$(du -sb "$layer_dir" | cut -f1)
        local size_mb=$((size_bytes / 1024 / 1024))
        
        echo "📊 Layer size: ${size_mb}MB (limit: ${max_size_mb}MB)"
        
        if [ $size_mb -gt $max_size_mb ]; then
            echo "❌ ERROR: Layer size (${size_mb}MB) exceeds limit (${max_size_mb}MB)"
            echo "This will cause Lambda deployment failures. Aborting build."
            exit 1
        fi
        
        echo "✅ Layer size is within limits"
    fi
}

# Function to aggressively prune unnecessary files
prune_layer() {
    local layer_dir="$1"
    
    echo "🧹 Aggressively pruning layer to reduce size..."
    
    # Remove development and testing files
    find "$layer_dir" -name "*.md" -delete 2>/dev/null || true
    find "$layer_dir" -name "*.txt" -delete 2>/dev/null || true
    find "$layer_dir" -name "LICENSE*" -delete 2>/dev/null || true
    find "$layer_dir" -name "CHANGELOG*" -delete 2>/dev/null || true
    find "$layer_dir" -name "*.ts" -delete 2>/dev/null || true
    find "$layer_dir" -name "*.map" -delete 2>/dev/null || true
    
    # Remove test directories
    find "$layer_dir" -name "test" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$layer_dir" -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$layer_dir" -name "__tests__" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$layer_dir" -name "spec" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Remove documentation directories
    find "$layer_dir" -name "docs" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$layer_dir" -name "doc" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$layer_dir" -name ".github" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Remove examples and samples
    find "$layer_dir" -name "example*" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$layer_dir" -name "sample*" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Remove development files
    find "$layer_dir" -name ".eslint*" -delete 2>/dev/null || true
    find "$layer_dir" -name ".prettier*" -delete 2>/dev/null || true
    find "$layer_dir" -name "tsconfig*" -delete 2>/dev/null || true
    find "$layer_dir" -name "jest*" -delete 2>/dev/null || true
    find "$layer_dir" -name ".git*" -delete 2>/dev/null || true
    
    echo "✅ Layer pruning completed"
}

# Build Prisma Engine Layer (minimal runtime dependencies)
build_prisma_engine_layer() {
    local output_dir="$INFRA_CDK_DIR/lambda-layers-prisma-client-engine"
    
    echo "🏗️  Building Prisma Engine layer..."
    cd "$output_dir"
    
    # Clean existing build
    rm -rf nodejs nodejs.tar.gz
    
    # Create minimal layer structure
    mkdir -p nodejs/node_modules/.prisma/client
    mkdir -p nodejs/node_modules/@prisma
    mkdir -p nodejs/prisma
    
    # Generate RHEL-specific Prisma client
    cd "$APP_API_DIR"
    echo "Generating RHEL Prisma client..."
    PRISMA_CLI_BINARY_TARGETS=rhel-openssl-3.0.x pnpm exec prisma generate
    
    cd "$output_dir"
    
    # Copy only essential Prisma runtime files
    echo "Copying minimal Prisma runtime files..."
    rsync -av "$APP_API_DIR/node_modules/@prisma/client/" nodejs/node_modules/@prisma/client/
    
    # Find Prisma client in pnpm store and copy only .prisma directory
    local prisma_client_path=$(find "$PROJECT_ROOT/node_modules/.pnpm" -name "@prisma+client@*" -type d | head -1)
    if [ -n "$prisma_client_path" ]; then
        rsync -av "$prisma_client_path/node_modules/.prisma/" nodejs/node_modules/.prisma/
    fi
    
    # Copy schema (required for runtime)
    rsync -av "$APP_API_DIR/prisma/schema.prisma" nodejs/prisma/
    
    # Remove ALL non-RHEL binaries aggressively
    echo "Removing non-RHEL binaries..."
    find nodejs -type f ! -name "*rhel-openssl-3.0.x*" -name "*.node" -delete 2>/dev/null || true
    find nodejs -type f -name "*debian*" -delete 2>/dev/null || true
    find nodejs -type f -name "*darwin*" -delete 2>/dev/null || true
    find nodejs -type f -name "*windows*" -delete 2>/dev/null || true
    find nodejs -type f -name "*linux-musl*" -delete 2>/dev/null || true
    
    # Remove Prisma CLI (not needed for runtime)
    rm -rf nodejs/node_modules/@prisma/cli 2>/dev/null || true
    rm -rf nodejs/node_modules/prisma/engines 2>/dev/null || true
    
    # Aggressive pruning
    prune_layer "nodejs"
    
    # Check size before compression
    check_layer_size "nodejs"
    
    # Compress
    tar -zcf nodejs.tar.gz nodejs/
    echo "✅ Prisma Engine layer built: $(du -sh nodejs.tar.gz | cut -f1)"
}

# Build Prisma Migration Layer (includes migration tools)
build_prisma_migration_layer() {
    local output_dir="$INFRA_CDK_DIR/lambda-layers-prisma-client-migration"
    
    echo "🏗️  Building Prisma Migration layer..."
    cd "$output_dir"
    
    # Clean existing build
    rm -rf nodejs nodejs.tar.gz
    
    # Build engine layer first as base
    mkdir -p nodejs
    cd "$INFRA_CDK_DIR/lambda-layers-prisma-client-engine"
    if [ ! -f "nodejs.tar.gz" ]; then
        echo "Building engine layer first..."
        cd "$SCRIPT_DIR" && ./build-layer.sh engine
        cd "$INFRA_CDK_DIR/lambda-layers-prisma-client-engine"
    fi
    
    # Extract engine layer as base
    cd "$output_dir"
    tar -xzf "../lambda-layers-prisma-client-engine/nodejs.tar.gz"
    
    # Add migration-specific dependencies
    echo "Adding migration tools..."
    
    # Copy minimal pg module for migrations
    local pg_path=$(find "$PROJECT_ROOT/node_modules/.pnpm" -name "pg@*" -type d | grep -v "node_modules/pg" | head -1)
    if [ -n "$pg_path" ]; then
        mkdir -p nodejs/node_modules/pg
        rsync -av "$pg_path/node_modules/pg/" nodejs/node_modules/pg/
    fi
    
    # Copy migration files
    rsync -av "$APP_API_DIR/prisma/migrations/" nodejs/prisma/migrations/
    
    # Aggressive pruning for migration layer
    prune_layer "nodejs"
    
    # Remove even more files specific to migration layer
    find nodejs -name "*.d.ts" -delete 2>/dev/null || true
    find nodejs -name "*.js.map" -delete 2>/dev/null || true
    
    # Check size before compression
    check_layer_size "nodejs"
    
    # Compress
    tar -zcf nodejs.tar.gz nodejs/
    echo "✅ Prisma Migration layer built: $(du -sh nodejs.tar.gz | cut -f1)"
}

# Build PostgreSQL Tools Layer
build_postgres_tools_layer() {
    local output_dir="$INFRA_CDK_DIR/lambda-layers-postgres-tools"
    
    echo "🏗️  Building PostgreSQL Tools layer..."
    cd "$output_dir"
    
    # Clean existing build
    rm -rf nodejs nodejs.tar.gz
    
    # Create minimal layer with only essential pg modules
    mkdir -p nodejs/node_modules
    
    # Create temporary package.json for production install
    cat > package.json << 'EOF'
{
  "name": "postgres-tools-layer",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "pg": "^8.11.3",
    "pg-format": "^1.0.4"
  }
}
EOF
    
    # Install production dependencies only
    echo "Installing production dependencies..."
    pnpm install --prod --ignore-workspace --no-frozen-lockfile
    
    # Move node_modules into layer structure
    mv node_modules nodejs/
    rm package.json pnpm-lock.yaml 2>/dev/null || true
    
    # Create metadata
    cat > nodejs/layer-metadata.json << 'EOF'
{
  "postgres_version": "node-pg-8.11.3",
  "tools": ["pg client library", "pg-format"],
  "optimized": true
}
EOF
    
    # Aggressive pruning
    prune_layer "nodejs"
    
    # Check size before compression
    check_layer_size "nodejs"
    
    # Compress
    tar -zcf nodejs.tar.gz nodejs/
    echo "✅ PostgreSQL Tools layer built: $(du -sh nodejs.tar.gz | cut -f1)"
}

# Main execution
case "$LAYER_TYPE" in
    "engine")
        build_prisma_engine_layer
        ;;
    "migration")  
        build_prisma_migration_layer
        ;;
    "postgres-tools")
        build_postgres_tools_layer
        ;;
    "all")
        build_prisma_engine_layer
        build_prisma_migration_layer
        build_postgres_tools_layer
        ;;
    *)
        echo "❌ Invalid layer type: $LAYER_TYPE"
        echo "Valid options: engine, migration, postgres-tools, all"
        exit 1
        ;;
esac

echo "🎉 Layer build completed successfully!"