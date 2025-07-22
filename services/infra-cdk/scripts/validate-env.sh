#!/bin/bash
# Validate environment variables for MCR CDK

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if stage is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Stage not provided${NC}"
    echo "Usage: ./validate-env.sh <stage>"
    echo "Example: ./validate-env.sh dev"
    exit 1
fi

STAGE=$1

# Validate stage
if [[ ! "$STAGE" =~ ^(dev|val|prod)$ ]]; then
    echo -e "${RED}Error: Invalid stage '$STAGE'${NC}"
    echo "Stage must be one of: dev, val, prod"
    exit 1
fi

# Check if env file exists
if [ ! -f ".env.$STAGE" ]; then
    echo -e "${RED}Error: .env.$STAGE file not found${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env.$STAGE | grep -v '^#' | xargs)

# Required variables
REQUIRED_VARS=(
    "${STAGE^^}_ACCOUNT_ID"
    "${STAGE^^}_VPC_ID"
    "${STAGE^^}_PRIVATE_SUBNET_IDS"
    "${STAGE^^}_LAMBDA_SG_ID"
    "AWS_REGION"
)

# Optional variables
OPTIONAL_VARS=(
    "${STAGE^^}_ISOLATED_SUBNET_IDS"
    "${STAGE^^}_DATABASE_SG_ID"
    "SAML_METADATA_URL"
)

echo -e "${YELLOW}Validating environment variables for $STAGE...${NC}"
echo ""

# Check required variables
MISSING_REQUIRED=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_REQUIRED+=($var)
        echo -e "${RED}✗ $var - MISSING (REQUIRED)${NC}"
    else
        echo -e "${GREEN}✓ $var - ${!var}${NC}"
    fi
done

echo ""

# Check optional variables
for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${YELLOW}○ $var - Not set (optional)${NC}"
    else
        echo -e "${GREEN}✓ $var - ${!var}${NC}"
    fi
done

echo ""

# Validate format of certain variables
echo -e "${YELLOW}Validating variable formats...${NC}"

# Validate Account ID (12 digits)
ACCOUNT_VAR="${STAGE^^}_ACCOUNT_ID"
if [[ ! "${!ACCOUNT_VAR}" =~ ^[0-9]{12}$ ]]; then
    echo -e "${RED}✗ $ACCOUNT_VAR format invalid - must be 12 digits${NC}"
else
    echo -e "${GREEN}✓ $ACCOUNT_VAR format valid${NC}"
fi

# Validate VPC ID format
VPC_VAR="${STAGE^^}_VPC_ID"
if [[ ! "${!VPC_VAR}" =~ ^vpc-[a-z0-9]+$ ]]; then
    echo -e "${RED}✗ $VPC_VAR format invalid - must start with 'vpc-'${NC}"
else
    echo -e "${GREEN}✓ $VPC_VAR format valid${NC}"
fi

# Validate subnet IDs format
SUBNET_VAR="${STAGE^^}_PRIVATE_SUBNET_IDS"
IFS=',' read -ra SUBNETS <<< "${!SUBNET_VAR}"
INVALID_SUBNETS=()
for subnet in "${SUBNETS[@]}"; do
    subnet=$(echo $subnet | xargs) # trim whitespace
    if [[ ! "$subnet" =~ ^subnet-[a-z0-9]+$ ]]; then
        INVALID_SUBNETS+=($subnet)
    fi
done

if [ ${#INVALID_SUBNETS[@]} -gt 0 ]; then
    echo -e "${RED}✗ $SUBNET_VAR contains invalid subnet IDs: ${INVALID_SUBNETS[@]}${NC}"
else
    echo -e "${GREEN}✓ $SUBNET_VAR format valid (${#SUBNETS[@]} subnets)${NC}"
fi

# Validate security group format
SG_VAR="${STAGE^^}_LAMBDA_SG_ID"
if [[ ! "${!SG_VAR}" =~ ^sg-[a-z0-9]+$ ]]; then
    echo -e "${RED}✗ $SG_VAR format invalid - must start with 'sg-'${NC}"
else
    echo -e "${GREEN}✓ $SG_VAR format valid${NC}"
fi

echo ""

# Summary
if [ ${#MISSING_REQUIRED[@]} -gt 0 ]; then
    echo -e "${RED}Validation FAILED - Missing required variables:${NC}"
    for var in "${MISSING_REQUIRED[@]}"; do
        echo -e "${RED}  - $var${NC}"
    done
    exit 1
else
    echo -e "${GREEN}All required environment variables are set and valid!${NC}"
fi
