#!/bin/bash

# Test zip_keys Lambda Function  
# This script tests the zip_keys Lambda with proper API Gateway event format

set -e

STAGE="${1:-dev}"
REGION="${AWS_REGION:-us-east-1}"
FUNCTION_NAME="mcr-cdk-${STAGE}-file-ops-zip-keys"

echo "Testing zip_keys Lambda: $FUNCTION_NAME"
echo "Region: $REGION"
echo ""

# Create test payload with API Gateway format (not S3 event)
PAYLOAD=$(cat <<'EOF'
{
  "httpMethod": "POST",
  "path": "/zip",
  "headers": {
    "content-type": "application/json",
    "authorization": "Bearer test-token"
  },
  "requestContext": {
    "accountId": "123456789012",
    "apiId": "test-api",
    "identity": {
      "accountId": "123456789012",
      "sourceIp": "127.0.0.1",
      "user": "test-user",
      "userAgent": "test-script",
      "userArn": "arn:aws:iam::123456789012:user/test"
    },
    "stage": "dev",
    "requestId": "test-request-id"
  },
  "body": "{\"fileKeys\":[\"test-key\"]}"
}
EOF
)

# Encode payload as base64
ENCODED_PAYLOAD=$(echo -n "$PAYLOAD" | base64)

echo "Invoking Lambda function..."
echo "Payload: API Gateway POST /zip request"
echo ""

# Invoke the function
aws lambda invoke \
    --region "$REGION" \
    --function-name "$FUNCTION_NAME" \
    --payload "$ENCODED_PAYLOAD" \
    --log-type Tail \
    --output json \
    /tmp/zip-keys-response.json

# Check the result
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Lambda invocation succeeded"
    echo ""
    echo "Response:"
    cat /tmp/zip-keys-response.json | jq '.'
    
    # Check for function errors
    ERROR=$(cat /tmp/zip-keys-response.json | jq -r '.FunctionError // "none"')
    if [ "$ERROR" != "none" ]; then
        echo ""
        echo "⚠️  Function Error: $ERROR"
        
        # Decode log result if present
        LOG_RESULT=$(cat /tmp/zip-keys-response.json | jq -r '.LogResult // ""')
        if [ -n "$LOG_RESULT" ]; then
            echo ""
            echo "CloudWatch Logs:"
            echo "$LOG_RESULT" | base64 -d
        fi
    fi
    
    # Parse the actual response payload
    if [ -f /tmp/zip-keys-response.json ]; then
        RESPONSE_PAYLOAD=$(cat /tmp/zip-keys-response.json | jq -r '.Payload // "{}"' | jq '.')
        echo ""
        echo "Response Payload:"
        echo "$RESPONSE_PAYLOAD"
    fi
else
    echo ""
    echo "❌ Lambda invocation failed"
    exit 1
fi

echo ""
echo "To view CloudWatch logs:"
echo "aws logs tail /aws/lambda/$FUNCTION_NAME --follow"