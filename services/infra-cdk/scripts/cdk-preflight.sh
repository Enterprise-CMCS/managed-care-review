#!/bin/bash
# CDK deployment preflight checks
# Ensures all prerequisites are met before CDK operations

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running CDK deployment preflight checks...${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CDK_DIR="$SCRIPT_DIR/.."
REPO_ROOT="$CDK_DIR/../.."

# Check 1: Verify we're in the right directory structure
echo -e "${YELLOW}Checking directory structure...${NC}"
if [ ! -d "$REPO_ROOT/packages" ]; then
    echo -e "${RED}ERROR: Cannot find packages directory. Are you in the correct repository?${NC}"
    exit 1
fi

# Check 2: Verify all critical packages are built
echo -e "${YELLOW}Checking package builds...${NC}"
PACKAGES=("hpp" "common" "constants" "dates" "helpers")
MISSING_BUILDS=()

for pkg in "${PACKAGES[@]}"; do
    if [ -d "$REPO_ROOT/packages/$pkg" ]; then
        if [ ! -d "$REPO_ROOT/packages/$pkg/build" ] && [ ! -d "$REPO_ROOT/packages/$pkg/dist" ]; then
            MISSING_BUILDS+=("$pkg")
        fi
    fi
done

if [ ${#MISSING_BUILDS[@]} -gt 0 ]; then
    echo -e "${RED}ERROR: The following packages are not built: ${MISSING_BUILDS[*]}${NC}"
    echo -e "${YELLOW}Run 'pnpm build:packages' from the repository root first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All critical packages are built${NC}"

# Check 3: Verify Prisma client is generated
echo -e "${YELLOW}Checking Prisma client...${NC}"
if [ ! -d "$REPO_ROOT/services/app-api/node_modules/.prisma/client" ] && [ ! -d "$REPO_ROOT/node_modules/.prisma/client" ]; then
    echo -e "${YELLOW}WARNING: Prisma client not generated.${NC}"
    echo -e "${YELLOW}Run 'pnpm -r generate' from the repository root for functions that need Prisma.${NC}"
else
    echo -e "${GREEN}✓ Prisma client is generated${NC}"
fi

# Check 4: Verify CDK dependencies are installed
echo -e "${YELLOW}Checking CDK dependencies...${NC}"
if [ ! -d "$CDK_DIR/node_modules" ]; then
    echo -e "${RED}ERROR: CDK dependencies not installed.${NC}"
    echo -e "${YELLOW}Run 'pnpm install' in the services/infra-cdk directory.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ CDK dependencies are installed${NC}"

# Check 5: Verify workspace dependencies are installed
echo -e "${YELLOW}Checking workspace dependencies...${NC}"
if [ ! -d "$REPO_ROOT/node_modules" ]; then
    echo -e "${RED}ERROR: Workspace dependencies not installed.${NC}"
    echo -e "${YELLOW}Run 'pnpm install' from the repository root.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Workspace dependencies are installed${NC}"

# Check 6: Verify HPP package exports (specific check for our issue)
echo -e "${YELLOW}Checking HPP package exports...${NC}"
if [ -f "$REPO_ROOT/packages/hpp/build/proto/healthPlanFormDataProto/zodSchemas.js" ]; then
    if ! grep -q "rateMedicaidPopulationsSchema" "$REPO_ROOT/packages/hpp/build/proto/healthPlanFormDataProto/zodSchemas.js"; then
        echo -e "${RED}ERROR: rateMedicaidPopulationsSchema not found in HPP exports.${NC}"
        echo -e "${YELLOW}The HPP package needs to be rebuilt. Run 'pnpm build:packages' from the repository root.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ HPP package exports are valid${NC}"
else
    echo -e "${YELLOW}WARNING: Cannot verify HPP exports - file not found${NC}"
fi

# Check 7: Verify AWS credentials (optional check)
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${YELLOW}WARNING: AWS credentials not configured or expired.${NC}"
    echo -e "${YELLOW}You may need to configure AWS credentials before deployment.${NC}"
else
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✓ AWS credentials configured (Account: $ACCOUNT_ID)${NC}"
fi

# Check 8: Verify Prisma layers are prepared (if needed)
echo -e "${YELLOW}Checking Prisma Lambda layers...${NC}"
if [ -f "$CDK_DIR/scripts/prepare-prisma-layers.sh" ]; then
    if [ ! -f "$CDK_DIR/lambda-layers-prisma-client-engine/nodejs.tar.gz" ] || [ ! -f "$CDK_DIR/lambda-layers-prisma-client-migration/nodejs.tar.gz" ]; then
        echo -e "${YELLOW}WARNING: Prisma Lambda layers not built.${NC}"
        echo -e "${YELLOW}Run 'pnpm prepare:prisma' in services/infra-cdk if you need Prisma layers.${NC}"
    else
        echo -e "${GREEN}✓ Prisma Lambda layers are prepared${NC}"
    fi
fi

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ All preflight checks passed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "You can now run CDK commands safely."