#!/bin/bash
set -e

# Test script to verify Prisma layers can be built
echo "Testing Prisma layer build process..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CDK_DIR="$SCRIPT_DIR/.."
APP_API_DIR="$CDK_DIR/../app-api"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if app-api exists
if [ ! -d "$APP_API_DIR" ]; then
    echo -e "${RED}Error: app-api directory not found at $APP_API_DIR${NC}"
    exit 1
fi

# Check if Prisma schema exists
if [ ! -f "$APP_API_DIR/prisma/schema.prisma" ]; then
    echo -e "${RED}Error: Prisma schema not found at $APP_API_DIR/prisma/schema.prisma${NC}"
    exit 1
fi

# Check if pnpm is available
if ! command -v pnpm >/dev/null 2>&1; then
    echo -e "${RED}Error: pnpm is not installed${NC}"
    exit 1
fi

# Check node_modules in app-api
if [ ! -d "$APP_API_DIR/node_modules" ]; then
    echo -e "${YELLOW}app-api node_modules not found. Installing dependencies...${NC}"
    cd "$APP_API_DIR"
    pnpm install
fi

# Test Prisma generate
echo -e "${YELLOW}Testing Prisma generate with RHEL target...${NC}"
cd "$APP_API_DIR"
PRISMA_CLI_BINARY_TARGETS=rhel-openssl-3.0.x pnpm exec prisma generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Prisma generate successful${NC}"
else
    echo -e "${RED}✗ Prisma generate failed${NC}"
    exit 1
fi

# Check if RHEL binary was generated
RHEL_BINARY="$APP_API_DIR/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node"
if [ -f "$RHEL_BINARY" ]; then
    echo -e "${GREEN}✓ RHEL binary found: $RHEL_BINARY${NC}"
else
    echo -e "${RED}✗ RHEL binary not found${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Prisma layer build test successful!${NC}"
echo -e "${GREEN}========================================${NC}"