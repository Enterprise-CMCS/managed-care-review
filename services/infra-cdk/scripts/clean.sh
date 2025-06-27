#!/bin/bash
# Cleanup script for MCR CDK

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Cleaning up CDK artifacts...${NC}"

# Remove CDK output directory
if [ -d "cdk.out" ]; then
    echo "Removing cdk.out directory..."
    rm -rf cdk.out
fi

# Remove node_modules if requested
if [ "$1" == "--full" ]; then
    echo -e "${YELLOW}Full cleanup requested...${NC}"
    
    if [ -d "node_modules" ]; then
        echo "Removing node_modules..."
        rm -rf node_modules
    fi
    
    if [ -d "coverage" ]; then
        echo "Removing coverage directory..."
        rm -rf coverage
    fi
    
    if [ -d ".nyc_output" ]; then
        echo "Removing .nyc_output directory..."
        rm -rf .nyc_output
    fi
fi

# Remove TypeScript build artifacts
find . -name "*.js" -not -path "./node_modules/*" -not -name "jest.config.js" -delete 2>/dev/null || true
find . -name "*.d.ts" -not -path "./node_modules/*" -delete 2>/dev/null || true
find . -name "*.js.map" -not -path "./node_modules/*" -delete 2>/dev/null || true

echo -e "${GREEN}Cleanup complete!${NC}"

if [ "$1" != "--full" ]; then
    echo -e "${YELLOW}Tip: Use './clean.sh --full' to also remove node_modules${NC}"
fi
