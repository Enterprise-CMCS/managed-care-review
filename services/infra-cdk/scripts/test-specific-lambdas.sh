#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🧪 Test Specific Lambda Functions${NC}"
echo -e "${BLUE}========================================${NC}"

REGION="${AWS_REGION:-us-east-1}"

# Test functions that should work after fixes
FUNCTIONS=(
  "mcr-cdk-dev-public-api-health"
  "mcr-cdk-dev-graphql-api-graphql"
  "mcr-cdk-dev-postgres-dbExport"
  "mcr-cdk-dev-scheduled-tasks-cleanup"
)

echo -e "${YELLOW}Testing fixed Lambda functions...${NC}\n"

for func in "${FUNCTIONS[@]}"; do
  echo -e "${YELLOW}Testing $func...${NC}"
  
  # Simple test payload
  PAYLOAD='{"test": true}'
  
  # Special payload for health check
  if [[ "$func" == *"health"* ]]; then
    PAYLOAD='{"httpMethod": "GET", "path": "/health"}'
  fi
  
  # Special payload for GraphQL
  if [[ "$func" == *"graphql"* ]]; then
    PAYLOAD='{"httpMethod": "POST", "body": "{\"query\": \"{ __typename }\"}"}'
  fi
  
  # Invoke function
  RESULT=$(aws lambda invoke \
    --function-name "$func" \
    --payload "$PAYLOAD" \
    --region "$REGION" \
    response.json 2>&1 || echo "FAILED")
  
  if [[ "$RESULT" == *"FAILED"* ]]; then
    echo -e "${RED}  ❌ Failed to invoke${NC}"
  else
    # Check for errors in response
    if grep -q "FunctionError" <<< "$RESULT"; then
      echo -e "${RED}  ❌ Function error${NC}"
      cat response.json
    else
      echo -e "${GREEN}  ✅ Success${NC}"
      # Show response for health check
      if [[ "$func" == *"health"* ]]; then
        cat response.json
      fi
    fi
  fi
  
  rm -f response.json
  echo
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test complete!${NC}"
echo -e "${GREEN}========================================${NC}"
