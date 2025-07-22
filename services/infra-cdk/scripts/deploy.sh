#!/bin/bash
# Deploy script for MCR CDK infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if stage is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Stage not provided${NC}"
    echo "Usage: ./deploy.sh <stage> [stack-name]"
    echo "Example: ./deploy.sh dev"
    echo "Example: ./deploy.sh dev MCR-Foundation-dev"
    exit 1
fi

STAGE=$1
STACK=$2

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|val|prod)$ ]]; then
    echo -e "${RED}Error: Invalid stage '$STAGE'${NC}"
    echo "Stage must be one of: dev, val, prod"
    exit 1
fi

# Load environment variables
if [ -f ".env.$STAGE" ]; then
    echo -e "${GREEN}Loading environment variables from .env.$STAGE${NC}"
    export $(cat .env.$STAGE | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: .env.$STAGE file not found${NC}"
    echo "Please create .env.$STAGE with required variables"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
aws sts get-caller-identity > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    exit 1
fi

# Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
pnpm run build

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
pnpm test

# Synthesize CloudFormation
echo -e "${YELLOW}Synthesizing CloudFormation templates...${NC}"
npx cdk synth --context stage=$STAGE

# Deploy
if [ -z "$STACK" ]; then
    echo -e "${GREEN}Deploying all stacks for $STAGE...${NC}"
    npx cdk deploy --all --context stage=$STAGE --require-approval never
else
    echo -e "${GREEN}Deploying $STACK...${NC}"
    npx cdk deploy $STACK --context stage=$STAGE --require-approval never
fi

echo -e "${GREEN}Deployment complete!${NC}"
