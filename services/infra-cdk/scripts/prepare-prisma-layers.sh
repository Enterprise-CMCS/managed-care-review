#!/bin/bash
set -e

# Script to prepare Prisma Lambda layers before CDK deployment
# This ensures the layers are built with the correct binaries

echo "Preparing Prisma Lambda layers..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CDK_DIR="$SCRIPT_DIR/.."

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists pnpm; then
    echo -e "${RED}Error: pnpm is not installed. Please install pnpm first.${NC}"
    exit 1
fi

if ! command_exists rsync; then
    echo -e "${RED}Error: rsync is not installed. Please install rsync first.${NC}"
    exit 1
fi

# Ensure app-api dependencies are installed
echo -e "${YELLOW}Ensuring app-api dependencies are installed...${NC}"
cd "$CDK_DIR/../app-api"
if [ ! -d "node_modules" ]; then
    echo "Installing app-api dependencies..."
    pnpm install
fi

# Build Prisma Migration Layer
echo -e "${YELLOW}Building Prisma Migration Layer...${NC}"
cd "$CDK_DIR/lambda-layers-prisma-client-migration"
if [ -f "build.sh" ]; then
    bash build.sh
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Prisma Migration Layer built successfully${NC}"
    else
        echo -e "${RED}✗ Failed to build Prisma Migration Layer${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: build.sh not found in lambda-layers-prisma-client-migration${NC}"
    exit 1
fi

# Build Prisma Engine Layer
echo -e "${YELLOW}Building Prisma Engine Layer...${NC}"
cd "$CDK_DIR/lambda-layers-prisma-client-engine"
if [ -f "build.sh" ]; then
    bash build.sh
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Prisma Engine Layer built successfully${NC}"
    else
        echo -e "${RED}✗ Failed to build Prisma Engine Layer${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: build.sh not found in lambda-layers-prisma-client-engine${NC}"
    exit 1
fi

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Prisma layers prepared successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Layer locations:"
echo "  - Migration: $CDK_DIR/lambda-layers-prisma-client-migration/nodejs.tar.gz"
echo "  - Engine: $CDK_DIR/lambda-layers-prisma-client-engine/nodejs.tar.gz"
echo ""
echo "You can now run CDK deploy commands."