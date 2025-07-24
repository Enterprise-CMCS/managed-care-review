#!/bin/bash
# Deploy Lambda layers CDK stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if stage is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Stage not provided${NC}"
    echo "Usage: ./deploy-layers.sh <stage>"
    echo "Example: ./deploy-layers.sh featureuserauth"
    exit 1
fi

STAGE=$1

# Validate stage name format
if [[ ! "$STAGE" =~ ^[a-z][a-z0-9]{2,22}$ ]]; then
    echo -e "${RED}Error: Invalid stage format '$STAGE'${NC}"
    echo "Stage must be 3-23 chars, lowercase alphanumeric, start with letter"
    exit 1
fi

echo -e "${GREEN}Deploying Lambda layers for stage: $STAGE${NC}"

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

# Prepare Prisma layers if not already done
echo -e "${YELLOW}Preparing Prisma Lambda layers...${NC}"
if [ ! -f "lambda-layers-prisma-client-engine/nodejs.tar.gz" ] || [ ! -f "lambda-layers-prisma-client-migration/nodejs.tar.gz" ]; then
    echo -e "${YELLOW}Prisma layers not found, running prepare script...${NC}"
    ./scripts/prepare-prisma-layers.sh
else
    echo -e "${GREEN}Prisma layers already prepared${NC}"
fi

# Deploy Lambda layers stack
echo -e "${GREEN}Deploying Lambda layers stack...${NC}"
npx cdk deploy MCR-LambdaLayers-${STAGE} --context stage=$STAGE --require-approval never

echo -e "${GREEN}Lambda layers deployment complete for $STAGE!${NC}"