#!/bin/bash
#
# Export CloudFormation outputs as environment variables for frontend build
# Usage: ./export-build-config.sh <stage>
#

set -euo pipefail

# Check if stage is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <stage>"
    echo "Example: $0 dev"
    exit 1
fi

STAGE=$1
REGION=${AWS_REGION:-us-east-1}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to get stack output
get_stack_output() {
    local stack_name=$1
    local output_key=$2
    local default_value=${3:-""}
    
    local value=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text \
        --region "$REGION" 2>/dev/null || echo "")
    
    if [ -z "$value" ] || [ "$value" == "None" ]; then
        if [ -n "$default_value" ]; then
            echo "$default_value"
        else
            echo ""
        fi
    else
        echo "$value"
    fi
}

# Function to check if stack exists
stack_exists() {
    local stack_name=$1
    
    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$REGION" &>/dev/null
}

echo -e "${YELLOW}Exporting build configuration for stage: $STAGE${NC}"

# Check if required stacks exist
REQUIRED_STACKS=(
    "infra-api-$STAGE"
    "ui-auth-$STAGE"
    "uploads-$STAGE"
    "ui-$STAGE"
)

for stack in "${REQUIRED_STACKS[@]}"; do
    if ! stack_exists "$stack"; then
        echo -e "${RED}Error: Stack $stack does not exist${NC}"
        echo "Please deploy the CDK stacks first"
        exit 1
    fi
done

# Export API configuration
echo -e "${GREEN}Fetching API configuration...${NC}"
API_URL=$(get_stack_output "infra-api-$STAGE" "ApiGatewayRestApiUrl")
echo "export VITE_APP_API_URL=\"$API_URL\""
echo "export VITE_APP_OTEL_COLLECTOR_URL=\"${API_URL}otel\""

# Export Auth configuration
echo -e "${GREEN}Fetching Auth configuration...${NC}"
echo "export VITE_APP_AUTH_MODE=\"AWS_COGNITO\""
echo "export VITE_APP_COGNITO_REGION=\"$(get_stack_output "ui-auth-$STAGE" "Region")\""
echo "export VITE_APP_COGNITO_ID_POOL_ID=\"$(get_stack_output "ui-auth-$STAGE" "IdentityPoolId")\""
echo "export VITE_APP_COGNITO_USER_POOL_ID=\"$(get_stack_output "ui-auth-$STAGE" "UserPoolId")\""
echo "export VITE_APP_COGNITO_USER_POOL_CLIENT_ID=\"$(get_stack_output "ui-auth-$STAGE" "UserPoolClientId")\""
echo "export VITE_APP_COGNITO_USER_POOL_CLIENT_DOMAIN=\"$(get_stack_output "ui-auth-$STAGE" "UserPoolClientDomain")\""

# Export S3 configuration
echo -e "${GREEN}Fetching S3 configuration...${NC}"
echo "export VITE_APP_S3_REGION=\"$REGION\""
echo "export VITE_APP_S3_DOCUMENTS_BUCKET=\"$(get_stack_output "uploads-$STAGE" "DocumentUploadsBucketName")\""
echo "export VITE_APP_S3_QA_BUCKET=\"$(get_stack_output "uploads-$STAGE" "QAUploadsBucketName")\""

# Export Frontend configuration
echo -e "${GREEN}Fetching Frontend configuration...${NC}"
echo "export VITE_APP_APPLICATION_ENDPOINT=\"$(get_stack_output "ui-$STAGE" "CloudFrontEndpointUrl")\""
echo "export VITE_APP_STAGE_NAME=\"$STAGE\""

# Optional: Export as a single JSON object
if [ "${EXPORT_AS_JSON:-false}" == "true" ]; then
    echo -e "${GREEN}Exporting as JSON...${NC}"
    cat > build-config.json <<EOF
{
  "VITE_APP_API_URL": "$API_URL",
  "VITE_APP_AUTH_MODE": "AWS_COGNITO",
  "VITE_APP_COGNITO_REGION": "$(get_stack_output "ui-auth-$STAGE" "Region")",
  "VITE_APP_COGNITO_ID_POOL_ID": "$(get_stack_output "ui-auth-$STAGE" "IdentityPoolId")",
  "VITE_APP_COGNITO_USER_POOL_ID": "$(get_stack_output "ui-auth-$STAGE" "UserPoolId")",
  "VITE_APP_COGNITO_USER_POOL_CLIENT_ID": "$(get_stack_output "ui-auth-$STAGE" "UserPoolClientId")",
  "VITE_APP_COGNITO_USER_POOL_CLIENT_DOMAIN": "$(get_stack_output "ui-auth-$STAGE" "UserPoolClientDomain")",
  "VITE_APP_S3_REGION": "$REGION",
  "VITE_APP_S3_DOCUMENTS_BUCKET": "$(get_stack_output "uploads-$STAGE" "DocumentUploadsBucketName")",
  "VITE_APP_S3_QA_BUCKET": "$(get_stack_output "uploads-$STAGE" "QAUploadsBucketName")",
  "VITE_APP_APPLICATION_ENDPOINT": "$(get_stack_output "ui-$STAGE" "CloudFrontEndpointUrl")",
  "VITE_APP_STAGE_NAME": "$STAGE",
  "VITE_APP_OTEL_COLLECTOR_URL": "${API_URL}otel"
}
EOF
    echo -e "${GREEN}Configuration exported to build-config.json${NC}"
fi

echo -e "${GREEN}Build configuration export complete!${NC}"
echo ""
echo "To use these environment variables:"
echo "  source <(./export-build-config.sh $STAGE)"
echo ""
echo "Or save to a file:"
echo "  ./export-build-config.sh $STAGE > .env.build"