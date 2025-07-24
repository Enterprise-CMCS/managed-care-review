#!/bin/bash
# Deploy foundational CDK stacks (Foundation, Network, Data, Auth)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if stage is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Stage not provided${NC}"
    echo "Usage: ./deploy-foundation.sh <stage>"
    echo "Example: ./deploy-foundation.sh featureuserauth"
    exit 1
fi

STAGE=$1

# Validate stage name format (AWS resource naming rules)
if [[ ! "$STAGE" =~ ^[a-z][a-z0-9]{2,22}$ ]]; then
    echo -e "${RED}Error: Invalid stage format '$STAGE'${NC}"
    echo "Stage must be 3-23 chars, lowercase alphanumeric, start with letter"
    exit 1
fi

echo -e "${GREEN}Deploying foundation stacks for stage: $STAGE${NC}"

# Load environment variables if they exist
if [ -f ".env.$STAGE" ]; then
    echo -e "${GREEN}Loading environment variables from .env.$STAGE${NC}"
    export $(cat .env.$STAGE | grep -v '^#' | xargs)
elif [ -f ".env.dev" ]; then
    echo -e "${YELLOW}Using .env.dev as fallback for stage $STAGE${NC}"
    export $(cat .env.dev | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}No environment file found, using existing environment${NC}"
fi

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
aws sts get-caller-identity > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    exit 1
fi

# Run preflight checks
echo -e "${YELLOW}Running preflight checks...${NC}"
./scripts/cdk-preflight.sh

# Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
pnpm run build

# Deploy foundation stacks in dependency order
echo -e "${GREEN}Deploying Foundation stack...${NC}"
npx cdk deploy MCR-Foundation-${STAGE} --context stage=$STAGE --require-approval never

echo -e "${GREEN}Deploying Network stack...${NC}"
npx cdk deploy MCR-Network-${STAGE} --context stage=$STAGE --require-approval never

echo -e "${GREEN}Deploying Data stack...${NC}"
npx cdk deploy MCR-Data-${STAGE} --context stage=$STAGE --require-approval never

echo -e "${GREEN}Deploying Auth stack...${NC}"
npx cdk deploy MCR-Auth-${STAGE} --context stage=$STAGE --require-approval never

echo -e "${GREEN}Foundation deployment complete for $STAGE!${NC}"