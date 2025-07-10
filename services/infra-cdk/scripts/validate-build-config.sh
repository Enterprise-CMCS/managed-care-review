#!/bin/bash
#
# Validate that all required build configuration is present
# Usage: ./validate-build-config.sh
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Required environment variables for frontend build
REQUIRED_VARS=(
    "VITE_APP_API_URL"
    "VITE_APP_AUTH_MODE"
    "VITE_APP_COGNITO_REGION"
    "VITE_APP_COGNITO_ID_POOL_ID"
    "VITE_APP_COGNITO_USER_POOL_ID"
    "VITE_APP_COGNITO_USER_POOL_CLIENT_ID"
    "VITE_APP_S3_REGION"
    "VITE_APP_S3_DOCUMENTS_BUCKET"
    "VITE_APP_S3_QA_BUCKET"
    "VITE_APP_STAGE_NAME"
)

# Optional environment variables
OPTIONAL_VARS=(
    "VITE_APP_COGNITO_USER_POOL_CLIENT_DOMAIN"
    "VITE_APP_APPLICATION_ENDPOINT"
    "VITE_APP_OTEL_COLLECTOR_URL"
    "VITE_APP_LD_CLIENT_ID"
    "VITE_APP_NR_ACCOUNT_ID"
    "VITE_APP_NR_AGENT_ID"
    "VITE_APP_NR_LICENSE_KEY"
    "VITE_APP_NR_TRUST_KEY"
)

echo -e "${YELLOW}Validating build configuration...${NC}"
echo ""

# Check required variables
missing_required=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        missing_required+=("$var")
        echo -e "${RED}✗ $var is not set${NC}"
    else
        echo -e "${GREEN}✓ $var = ${!var}${NC}"
    fi
done

echo ""

# Check optional variables
missing_optional=()
for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        missing_optional+=("$var")
        echo -e "${YELLOW}○ $var is not set (optional)${NC}"
    else
        echo -e "${GREEN}✓ $var = ${!var}${NC}"
    fi
done

echo ""

# Summary
if [ ${#missing_required[@]} -eq 0 ]; then
    echo -e "${GREEN}All required environment variables are set!${NC}"
    
    if [ ${#missing_optional[@]} -gt 0 ]; then
        echo -e "${YELLOW}${#missing_optional[@]} optional variables are not set${NC}"
    fi
    
    # Additional validation
    echo ""
    echo -e "${YELLOW}Performing additional validation...${NC}"
    
    # Check API URL format
    if [[ ! "$VITE_APP_API_URL" =~ ^https?:// ]]; then
        echo -e "${RED}✗ VITE_APP_API_URL should start with http:// or https://${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ API URL format is valid${NC}"
    fi
    
    # Check auth mode
    if [ "$VITE_APP_AUTH_MODE" != "AWS_COGNITO" ] && [ "$VITE_APP_AUTH_MODE" != "LOCAL" ]; then
        echo -e "${RED}✗ VITE_APP_AUTH_MODE should be 'AWS_COGNITO' or 'LOCAL'${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ Auth mode is valid${NC}"
    fi
    
    # Check stage name
    if [[ ! "$VITE_APP_STAGE_NAME" =~ ^(dev|val|prod|main)$ ]] && [[ ! "$VITE_APP_STAGE_NAME" =~ ^[a-z0-9-]+$ ]]; then
        echo -e "${RED}✗ VITE_APP_STAGE_NAME appears to be invalid${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ Stage name is valid${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}Build configuration is valid!${NC}"
    exit 0
else
    echo -e "${RED}${#missing_required[@]} required environment variables are missing!${NC}"
    echo ""
    echo "To fix this, either:"
    echo "1. Export the configuration from deployed CDK stacks:"
    echo "   source <(./export-build-config.sh <stage>)"
    echo ""
    echo "2. Set the variables manually:"
    for var in "${missing_required[@]}"; do
        echo "   export $var=\"<value>\""
    done
    exit 1
fi