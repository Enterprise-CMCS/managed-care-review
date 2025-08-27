#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🚀 CDK Rebuild and Deploy Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Stage
STAGE="${1:-dev}"
echo -e "${YELLOW}Stage: $STAGE${NC}"

# Step 1: Clean
echo -e "\n${YELLOW}1. Cleaning build artifacts...${NC}"
rm -rf cdk.out node_modules/.cache lib/**/*.js lib/**/*.d.ts

# Step 2: Build
echo -e "\n${YELLOW}2. Building TypeScript...${NC}"
npm run build

# Step 3: Synthesize
echo -e "\n${YELLOW}3. Synthesizing CDK app...${NC}"
npm run cdk -- synth --all -c stage=$STAGE

# Step 4: Deploy all stacks
echo -e "\n${YELLOW}4. Deploying all stacks...${NC}"
npm run cdk -- deploy --all --exclude LambdaLayers-$STAGE -c stage=$STAGE --require-approval never

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Summary of fixes applied:${NC}"
echo -e "  • Fixed lambda bundling to include collector.yml"
echo -e "  • Added DATABASE_ENGINE to all database functions" 
echo -e "  • Fixed redirect handler inline code"
echo -e "  • Fixed file-ops functions environment"
echo -e "  • Basic auth is Lambda@Edge (not regular Lambda)"

echo -e "\n${YELLOW}To test Lambda functions:${NC}"
echo -e "  ./scripts/test-specific-lambdas.sh"
