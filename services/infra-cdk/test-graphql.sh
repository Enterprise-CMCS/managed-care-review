#!/bin/bash

# Test GraphQL Lambda Function with Enhanced Debugging
# This script tests the GraphQL Lambda and shows detailed configuration

set -e

STAGE="${1:-dev}"
REGION="${AWS_REGION:-us-east-1}"
FUNCTION_NAME="mcr-cdk-${STAGE}-graphql-api-graphql"

echo "==============================================="
echo "Testing GraphQL Lambda: $FUNCTION_NAME"
echo "Region: $REGION"
echo "Stage: $STAGE"
echo "==============================================="
echo ""

# Check if function exists
echo "1. Checking if Lambda function exists..."
aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Function exists"
else
    echo "❌ Function not found: $FUNCTION_NAME"
    exit 1
fi
echo ""

# Check Lambda configuration
echo "2. Checking Lambda environment variables..."
echo "----------------------------------------"
ENV_VARS=$(aws lambda get-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --query "Environment.Variables" \
    --output json)

# Check specific important variables
DB_URL=$(echo "$ENV_VARS" | jq -r '.DATABASE_URL // "not set"')
SECRET_NAME=$(echo "$ENV_VARS" | jq -r '.SECRETS_MANAGER_SECRET // "not set"')
PARAM_MODE=$(echo "$ENV_VARS" | jq -r '.PARAMETER_STORE_MODE // "not set"')

echo "DATABASE_URL: $DB_URL"
echo "SECRETS_MANAGER_SECRET: $SECRET_NAME"
echo "PARAMETER_STORE_MODE: $PARAM_MODE"

# Show other relevant env vars
echo ""
echo "Other relevant variables:"
echo "$ENV_VARS" | jq -r 'to_entries[] | select(.key | test("DATABASE|SECRET|PARAM|AWS_REGION")) | "\(.key): \(.value)"'
echo ""

# If DATABASE_URL is AWS_SM, check if the secret exists
if [ "$DB_URL" = "AWS_SM" ]; then
    echo "3. DATABASE_URL is set to AWS_SM, checking Secrets Manager..."
    if [ "$SECRET_NAME" != "not set" ]; then
        echo "   Checking if secret '$SECRET_NAME' exists..."
        aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$REGION" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo "   ✅ Secret exists"
            # Try to get the secret value (without showing it)
            SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region "$REGION" --query "SecretString" --output text 2>/dev/null)
            if [ $? -eq 0 ]; then
                echo "   ✅ Secret is accessible"
                # Check if it has the required fields
                HAS_USERNAME=$(echo "$SECRET_VALUE" | jq -r 'has("username")')
                HAS_PASSWORD=$(echo "$SECRET_VALUE" | jq -r 'has("password")')
                HAS_HOST=$(echo "$SECRET_VALUE" | jq -r 'has("host")')
                HAS_PORT=$(echo "$SECRET_VALUE" | jq -r 'has("port")')
                echo "   Secret has username: $HAS_USERNAME"
                echo "   Secret has password: $HAS_PASSWORD"
                echo "   Secret has host: $HAS_HOST"
                echo "   Secret has port: $HAS_PORT"
            else
                echo "   ⚠️ Cannot read secret (permissions issue?)"
            fi
        else
            echo "   ❌ Secret '$SECRET_NAME' not found!"
        fi
    else
        echo "   ❌ SECRETS_MANAGER_SECRET is not set!"
    fi
else
    echo "3. DATABASE_URL is directly set (not using AWS_SM)"
fi
echo ""

# Create test payload
echo "4. Creating test payload..."
PAYLOAD=$(cat <<'EOF'
{
  "httpMethod": "POST",
  "path": "/graphql",
  "headers": {
    "content-type": "application/json"
  },
  "requestContext": {
    "accountId": "123456789012",
    "apiId": "test-api",
    "stage": "dev",
    "requestId": "test-request-id"
  },
  "body": "{\"query\":\"{__typename}\"}"
}
EOF
)

# Encode payload as base64
ENCODED_PAYLOAD=$(echo -n "$PAYLOAD" | base64)
echo "✅ Payload created (GraphQL introspection query)"
echo ""

# Invoke the function with logs
echo "5. Invoking Lambda function..."
echo "----------------------------------------"

# Create temp file for response
RESPONSE_FILE="/tmp/graphql-response-$$.json"
LOG_FILE="/tmp/graphql-logs-$$.txt"

# Invoke and capture everything
aws lambda invoke \
    --region "$REGION" \
    --function-name "$FUNCTION_NAME" \
    --payload "$ENCODED_PAYLOAD" \
    --log-type Tail \
    --cli-read-timeout 30 \
    "$RESPONSE_FILE" > "$LOG_FILE" 2>&1

INVOKE_STATUS=$?

if [ $INVOKE_STATUS -eq 0 ]; then
    echo "✅ Lambda invocation completed"
    
    # Extract and decode logs
    if grep -q "LogResult" "$LOG_FILE"; then
        echo ""
        echo "6. CloudWatch Logs (last 4KB):"
        echo "----------------------------------------"
        cat "$LOG_FILE" | jq -r '.LogResult' | base64 -d | tail -50
        echo "----------------------------------------"
    fi
    
    # Check for function error
    FUNCTION_ERROR=$(cat "$LOG_FILE" | jq -r '.FunctionError // "none"' 2>/dev/null)
    if [ "$FUNCTION_ERROR" != "none" ]; then
        echo ""
        echo "⚠️ Function Error Type: $FUNCTION_ERROR"
    fi
    
    # Show the actual response
    echo ""
    echo "7. Lambda Response:"
    echo "----------------------------------------"
    if [ -f "$RESPONSE_FILE" ]; then
        # Pretty print if it's JSON
        if cat "$RESPONSE_FILE" | jq . 2>/dev/null; then
            :  # JSON was valid and printed
        else
            # Not valid JSON, print as-is
            cat "$RESPONSE_FILE"
        fi
    fi
    echo ""
    
    # Check HTTP status code if present
    STATUS_CODE=$(cat "$RESPONSE_FILE" | jq -r '.statusCode // "N/A"' 2>/dev/null)
    if [ "$STATUS_CODE" != "N/A" ]; then
        echo "HTTP Status Code: $STATUS_CODE"
        if [ "$STATUS_CODE" -ge 200 ] && [ "$STATUS_CODE" -lt 300 ]; then
            echo "✅ Request successful"
        else
            echo "❌ Request failed with status $STATUS_CODE"
        fi
    fi
else
    echo "❌ Lambda invocation failed"
    echo "Error output:"
    cat "$LOG_FILE"
fi

# Cleanup
rm -f "$RESPONSE_FILE" "$LOG_FILE"

echo ""
echo "==============================================="
echo "To view live CloudWatch logs, run:"
echo "aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $REGION"
echo ""
echo "To update Lambda environment variables, run:"
echo "aws lambda update-function-configuration --function-name $FUNCTION_NAME --environment Variables={DATABASE_URL=AWS_SM,SECRETS_MANAGER_SECRET=aurora_postgres_${STAGE}} --region $REGION"
echo "==============================================="