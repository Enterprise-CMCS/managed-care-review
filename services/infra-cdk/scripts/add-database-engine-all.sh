#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 Add DATABASE_ENGINE to Functions${NC}"
echo -e "${BLUE}========================================${NC}"

REGION="${AWS_REGION:-us-east-1}"

# Functions that need DATABASE_ENGINE
DB_FUNCTIONS=(
  "mcr-cdk-dev-postgres-dbManager"
  "mcr-cdk-dev-postgres-dbExport"
  "mcr-cdk-dev-postgres-dbImport"
  "mcr-cdk-dev-postgres-migrate"
  "mcr-cdk-dev-postgres-migrate-document-zips"
  "mcr-cdk-dev-graphql-api-graphql"
  "mcr-cdk-dev-graphql-api-authorizer"
)

echo -e "${YELLOW}Adding DATABASE_ENGINE=postgres to database functions...${NC}"

for func in "${DB_FUNCTIONS[@]}"; do
  echo -e "\n${YELLOW}Updating $func...${NC}"
  
  # Check if function exists
  aws lambda get-function --function-name "$func" --region "$REGION" >/dev/null 2>&1 || {
    echo -e "${YELLOW}  Function not found, skipping${NC}"
    continue
  }
  
  # Get current environment variables
  CURRENT_ENV=$(aws lambda get-function-configuration \
    --function-name "$func" \
    --region "$REGION" \
    --query 'Environment.Variables' \
    --output json 2>/dev/null || echo "{}")
  
  # Add DATABASE_ENGINE
  if [ "$CURRENT_ENV" = "{}" ] || [ "$CURRENT_ENV" = "null" ]; then
    NEW_ENV='{"DATABASE_ENGINE":"postgres"}'
  else
    NEW_ENV=$(echo "$CURRENT_ENV" | jq '. + {"DATABASE_ENGINE": "postgres"}')
  fi
  
  # Update function
  aws lambda update-function-configuration \
    --function-name "$func" \
    --environment "Variables=$NEW_ENV" \
    --region "$REGION" >/dev/null && {
    echo -e "${GREEN}  ✅ DATABASE_ENGINE added${NC}"
  } || {
    echo -e "${YELLOW}  ⚠️  Update failed${NC}"
  }
done

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ DATABASE_ENGINE added to all functions${NC}"
echo -e "${GREEN}========================================${NC}"
