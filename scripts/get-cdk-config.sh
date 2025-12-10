#!/bin/bash

# Script to fetch CDK stack outputs for app-web build configuration
# Usage: ./get-cdk-config.sh <stage-name>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <stage-name>"
  exit 1
fi

STAGE_NAME="$1"
echo "Fetching CDK stack outputs for stage: $STAGE_NAME"

# Function to get CloudFormation stack output by export name
get_stack_export() {
  local export_name="$1"
  aws cloudformation list-exports \
    --query "Exports[?Name=='${export_name}'].Value" \
    --output text 2>/dev/null | head -n1
}

# Function to get SSM parameter (for monitoring configs)
get_ssm_param() {
  local param_name="$1"
  local env_var="$2"
  
  # Check if already set in environment
  if [ -n "${!env_var}" ]; then
    echo "${!env_var}"
  else
    # Fetch from SSM (fallback for optional params)
    aws ssm get-parameter --name "$param_name" --with-decryption \
      --query "Parameter.Value" --output text 2>/dev/null || echo ""
  fi
}

echo "=== Fetching CDK Stack Outputs ==="

# CDK export naming: <service>-<stage>-cdk-<OutputName>
APPAPI_PREFIX="app-api-${STAGE_NAME}-cdk"
COGNITO_PREFIX="cognito-${STAGE_NAME}-cdk"
UPLOADS_PREFIX="uploads-${STAGE_NAME}-cdk"
FRONTEND_PREFIX="frontend-infra-${STAGE_NAME}-cdk"

# Get stack outputs via CloudFormation exports
echo "Fetching API configuration..."
API_URL=$(get_stack_export "${APPAPI_PREFIX}-ApiGatewayUrl" || echo "")
if [ -z "$API_URL" ]; then
  echo "ERROR: Could not find API Gateway URL export: ${APPAPI_PREFIX}-ApiGatewayUrl"
  echo "Make sure the app-api CDK stack is deployed successfully."
  exit 1
fi

echo "Fetching Cognito configuration..."
COGNITO_REGION=$(get_stack_export "${COGNITO_PREFIX}-Region" || echo "us-east-1")
COGNITO_IDENTITY_POOL_ID=$(get_stack_export "${COGNITO_PREFIX}-IdentityPoolId" || echo "")
COGNITO_USER_POOL_ID=$(get_stack_export "${COGNITO_PREFIX}-UserPoolId" || echo "")
COGNITO_CLIENT_ID=$(get_stack_export "${COGNITO_PREFIX}-UserPoolClientId" || echo "")
COGNITO_USER_POOL_CLIENT_DOMAIN=$(get_stack_export "${COGNITO_PREFIX}-UserPoolClientDomain" || echo "")

echo "Fetching S3 configuration..."
S3_DOCUMENTS_BUCKET_NAME=$(get_stack_export "${UPLOADS_PREFIX}-DocumentUploadsBucketName" || echo "")
S3_QA_BUCKET_NAME=$(get_stack_export "${UPLOADS_PREFIX}-QAUploadsBucketName" || echo "")
S3_DOCUMENTS_BUCKET_REGION=$COGNITO_REGION

echo "Fetching frontend URL..."
# Try new ApplicationUrl export first (includes custom domain if configured)
APPLICATION_ENDPOINT=$(get_stack_export "${FRONTEND_PREFIX}-ApplicationUrl" || echo "")
# Fallback to CloudFrontEndpointUrl for backwards compatibility
if [ -z "$APPLICATION_ENDPOINT" ]; then
  APPLICATION_ENDPOINT=$(get_stack_export "${FRONTEND_PREFIX}-CloudFrontEndpointUrl" || echo "")
fi
if [ -z "$APPLICATION_ENDPOINT" ]; then
  echo "ERROR: Could not find application endpoint export: ${FRONTEND_PREFIX}-ApplicationUrl or ${FRONTEND_PREFIX}-CloudFrontEndpointUrl"
  echo "Make sure the frontend-infra CDK stack is deployed successfully."
  exit 1
fi

echo "=== Fetching Optional SSM Parameters ==="

# Get optional monitoring parameters
LD_CLIENT_ID=$(get_ssm_param "/configuration/react_app_ld_client_id_feds" "VITE_APP_LD_CLIENT_ID")
NR_ACCOUNT_ID=$(get_ssm_param "/configuration/react_app_nr_account_id" "VITE_APP_NR_ACCOUNT_ID")
NR_TRUST_KEY=$(get_ssm_param "/configuration/react_app_nr_trust_key" "VITE_APP_NR_TRUST_KEY")
NR_LICENSE_KEY=$(get_ssm_param "/configuration/react_app_nr_license_key" "VITE_APP_NR_LICENSE_KEY")
NR_AGENT_ID=$(get_ssm_param "/configuration/react_app_nr_agent_id" "VITE_APP_NR_AGENT_ID")

echo "=== Configuration Summary ==="
echo "VITE_APP_API_URL: $API_URL"
echo "VITE_APP_APPLICATION_ENDPOINT: $APPLICATION_ENDPOINT"
echo "VITE_APP_COGNITO_USER_POOL_ID: $COGNITO_USER_POOL_ID"
echo "VITE_APP_S3_DOCUMENTS_BUCKET: $S3_DOCUMENTS_BUCKET_NAME"
echo "VITE_APP_STAGE_NAME: $STAGE_NAME"

# Validate critical configuration
missing_vars=()
[ -z "$COGNITO_USER_POOL_ID" ] && missing_vars+=("COGNITO_USER_POOL_ID")
[ -z "$S3_DOCUMENTS_BUCKET_NAME" ] && missing_vars+=("S3_DOCUMENTS_BUCKET_NAME")

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo ""
  echo "ERROR: Missing critical configuration from CDK stacks:"
  printf ' - %s\n' "${missing_vars[@]}"
  echo ""
  echo "Make sure the following CDK stacks are deployed:"
  echo " - cognito-${STAGE_NAME}-cdk"
  echo " - uploads-${STAGE_NAME}-cdk"
  echo " - app-api-${STAGE_NAME}-cdk (optional for API_URL)"
  exit 1
fi

echo ""
echo "=== Exporting Environment Variables ==="

# Export all environment variables for Vite build
export VITE_APP_AUTH_MODE="${VITE_APP_AUTH_MODE:-AWS_COGNITO}"
export VITE_APP_API_URL="$API_URL"
export VITE_APP_APPLICATION_ENDPOINT="$APPLICATION_ENDPOINT"
export VITE_APP_COGNITO_REGION="$COGNITO_REGION"
export VITE_APP_COGNITO_ID_POOL_ID="$COGNITO_IDENTITY_POOL_ID"
export VITE_APP_COGNITO_USER_POOL_ID="$COGNITO_USER_POOL_ID"
export VITE_APP_COGNITO_USER_POOL_CLIENT_ID="$COGNITO_CLIENT_ID"
export VITE_APP_COGNITO_USER_POOL_CLIENT_DOMAIN="$COGNITO_USER_POOL_CLIENT_DOMAIN"
export VITE_APP_S3_REGION="$S3_DOCUMENTS_BUCKET_REGION"
export VITE_APP_S3_DOCUMENTS_BUCKET="$S3_DOCUMENTS_BUCKET_NAME"
export VITE_APP_S3_QA_BUCKET="$S3_QA_BUCKET_NAME"
export VITE_APP_STAGE_NAME="$STAGE_NAME"
export VITE_APP_OTEL_COLLECTOR_URL="${API_URL}/otel"
export VITE_APP_LD_CLIENT_ID="$LD_CLIENT_ID"
export VITE_APP_NR_ACCOUNT_ID="$NR_ACCOUNT_ID"
export VITE_APP_NR_AGENT_ID="$NR_AGENT_ID"
export VITE_APP_NR_LICENSE_KEY="$NR_LICENSE_KEY"
export VITE_APP_NR_TRUST_KEY="$NR_TRUST_KEY"

# Make variables available to calling script
cat << EOF > "/tmp/cdk-config-${STAGE_NAME}.env"
VITE_APP_AUTH_MODE=${VITE_APP_AUTH_MODE}
VITE_APP_API_URL=${API_URL}
VITE_APP_APPLICATION_ENDPOINT=${APPLICATION_ENDPOINT}
VITE_APP_COGNITO_REGION=${COGNITO_REGION}
VITE_APP_COGNITO_ID_POOL_ID=${COGNITO_IDENTITY_POOL_ID}
VITE_APP_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
VITE_APP_COGNITO_USER_POOL_CLIENT_ID=${COGNITO_CLIENT_ID}
VITE_APP_COGNITO_USER_POOL_CLIENT_DOMAIN=${COGNITO_USER_POOL_CLIENT_DOMAIN}
VITE_APP_S3_REGION=${S3_DOCUMENTS_BUCKET_REGION}
VITE_APP_S3_DOCUMENTS_BUCKET=${S3_DOCUMENTS_BUCKET_NAME}
VITE_APP_S3_QA_BUCKET=${S3_QA_BUCKET_NAME}
VITE_APP_STAGE_NAME=${STAGE_NAME}
VITE_APP_OTEL_COLLECTOR_URL=${API_URL}/otel
VITE_APP_LD_CLIENT_ID=${LD_CLIENT_ID}
VITE_APP_NR_ACCOUNT_ID=${NR_ACCOUNT_ID}
VITE_APP_NR_AGENT_ID=${NR_AGENT_ID}
VITE_APP_NR_LICENSE_KEY=${NR_LICENSE_KEY}
VITE_APP_NR_TRUST_KEY=${NR_TRUST_KEY}
EOF

echo "Configuration exported to /tmp/cdk-config-${STAGE_NAME}.env"
echo "Source this file in your build process: source /tmp/cdk-config-${STAGE_NAME}.env"
echo ""
echo "CDK configuration loaded successfully"