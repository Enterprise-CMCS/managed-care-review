#!/bin/bash
set -e

# Test Lambda layer sizes to prevent regression
# Ensures all layers stay under 50MB to prevent deployment failures

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
INFRA_CDK_DIR="$SCRIPT_DIR/.."

# Maximum allowed layer size in MB
MAX_SIZE_MB=50

echo "🧪 Testing Lambda layer sizes (max: ${MAX_SIZE_MB}MB)"

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test a layer size
test_layer_size() {
    local layer_name="$1"
    local layer_path="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ ! -f "$layer_path" ]; then
        echo "❌ FAIL: $layer_name - Layer file not found: $layer_path"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # Calculate size in MB
    local size_bytes=$(du -b "$layer_path" 2>/dev/null | cut -f1)
    local size_mb=$((size_bytes / 1024 / 1024))
    
    if [ $size_mb -le $MAX_SIZE_MB ]; then
        echo "✅ PASS: $layer_name - ${size_mb}MB (within ${MAX_SIZE_MB}MB limit)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "❌ FAIL: $layer_name - ${size_mb}MB exceeds ${MAX_SIZE_MB}MB limit"
        echo "  Layer will cause Lambda deployment failure"
        echo "  Path: $layer_path"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to test a layer directory
test_layer_directory() {
    local layer_name="$1"
    local layer_dir="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ ! -d "$layer_dir" ]; then
        echo "❌ FAIL: $layer_name - Layer directory not found: $layer_dir"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    
    # Calculate size in MB
    local size_bytes=$(du -sb "$layer_dir" 2>/dev/null | cut -f1)
    local size_mb=$((size_bytes / 1024 / 1024))
    
    if [ $size_mb -le $MAX_SIZE_MB ]; then
        echo "✅ PASS: $layer_name - ${size_mb}MB (within ${MAX_SIZE_MB}MB limit)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo "❌ FAIL: $layer_name - ${size_mb}MB exceeds ${MAX_SIZE_MB}MB limit"
        echo "  Layer will cause Lambda deployment failure"
        echo "  Path: $layer_dir"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo "Testing layer compressed archives..."
echo "═══════════════════════════════════════"

# Test compressed layer files
test_layer_size "Prisma Engine (compressed)" "$INFRA_CDK_DIR/lambda-layers-prisma-client-engine/nodejs.tar.gz"
test_layer_size "Prisma Migration (compressed)" "$INFRA_CDK_DIR/lambda-layers-prisma-client-migration/nodejs.tar.gz"
test_layer_size "PostgreSQL Tools (compressed)" "$INFRA_CDK_DIR/lambda-layers-postgres-tools/nodejs.tar.gz"

echo ""
echo "Testing layer directories..."
echo "═══════════════════════════════════════"

# Test uncompressed layer directories
test_layer_directory "Prisma Engine (uncompressed)" "$INFRA_CDK_DIR/lambda-layers-prisma-client-engine/nodejs"
test_layer_directory "Prisma Migration (uncompressed)" "$INFRA_CDK_DIR/lambda-layers-prisma-client-migration/nodejs"
test_layer_directory "PostgreSQL Tools (uncompressed)" "$INFRA_CDK_DIR/lambda-layers-postgres-tools/nodejs"

echo ""
echo "Test Results Summary"
echo "═══════════════════════════════════════"
echo "Total tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo "🎉 All layer size tests passed!"
    echo "✅ All layers are within the 50MB limit and will deploy successfully"
    exit 0
else
    echo ""
    echo "💥 Some layer size tests failed!"
    echo "❌ Failed layers exceed the 50MB limit and will cause deployment failures"
    echo ""
    echo "To fix this:"
    echo "1. Run ./scripts/build-layer.sh all to rebuild optimized layers"
    echo "2. Check the build-layer.sh script for additional pruning opportunities"
    echo "3. Consider removing more unnecessary files or dependencies"
    exit 1
fi