#!/usr/bin/env bash
set -u

# Script to invoke the database manager lambda function
# Usage: ./db-manager.sh create|delete stageName dbSecretArn

action="$1"        # create or delete
stage_name="$2"    # The stage/environment name for the database
secret_arn="$3"    # ARN of the secrets manager secret for the main dev DB
lambda_stage="${4:-dev}"  # Stage where the lambda is deployed, defaults to dev
function_name="postgres-${lambda_stage}-dbManager"
lambda_version="\$LATEST"
cli_read_timeout=240

# Ensure all required parameters are provided
if [[ -z "$action" || -z "$stage_name" || -z "$secret_arn" ]]; then
  echo "Usage: $0 create|delete stageName dbSecretArn [lambdaStage]" 1>&2
  exit 1
fi

# Validate action parameter
if [[ "$action" != "create" && "$action" != "delete" ]]; then
  echo "Error: Action must be 'create' or 'delete'" 1>&2
  exit 1
fi

# Create the payload JSON
payload=$(cat <<EOF
{
  "action": "$action",
  "stageName": "$stage_name",
  "devDbSecretArn": "$secret_arn"
}
EOF
)

echo "Invoking Lambda function: $function_name"
echo "Action: $action"
echo "Stage: $stage_name"

# Invoke the Lambda function
if (set -x ; aws lambda invoke \
      --qualifier "$lambda_version" \
      --cli-read-timeout "$cli_read_timeout" \
      --function-name "$function_name" \
      --payload "$payload" \
      --cli-binary-format raw-in-base64-out \
      lambda_response.json) ; then
  
  # Check if the response contains an error
  if jq -e '.FunctionError' lambda_response.json > /dev/null; then
    echo "Error: Lambda function returned an error" 1>&2
    
    # Extract the detailed error message
    if jq -e '.body' lambda_response.json > /dev/null 2>&1; then
      # Try to parse body if it exists
      jq -r '.body' lambda_response.json | jq '.'
    else
      # If no body, show the raw response which might contain error details
      cat lambda_response.json
    fi
    
    # Check if there's a payload in the response that contains error details
    if jq -e '.Payload' lambda_response.json > /dev/null 2>&1; then
      echo "Error details from payload:"
      jq -r '.Payload' lambda_response.json | jq '.'
    fi
    
    exit 1
  fi
  
  # Check if the response is valid JSON
  if ! jq empty lambda_response.json 2>/dev/null; then
    echo "Error: Lambda function returned invalid JSON" 1>&2
    cat lambda_response.json
    exit 1
  fi
  
  # Extract the body
  body=$(jq -r '.body' lambda_response.json)
  
  # If body is empty or null, check for Payload which might contain the actual response
  if [[ -z "$body" || "$body" == "null" ]]; then
    body=$(jq -r '.Payload' lambda_response.json)
    if [[ -z "$body" || "$body" == "null" ]]; then
      echo "Error: Lambda response missing body and Payload fields" 1>&2
      cat lambda_response.json
      exit 1
    fi
  fi
  
  # Try to parse the body (it might be a JSON string that needs to be parsed)
  parsed_body=$(echo "$body" | jq -r '.' 2>/dev/null)
  if [[ $? -eq 0 ]]; then
    body="$parsed_body"
  fi
  
  # Try to get status code from the parsed body
  status_code=$(echo "$body" | jq -r '.statusCode // 500' 2>/dev/null)
  
  if [[ "$status_code" != "200" ]]; then
    echo "Error: Database operation failed with status code $status_code" 1>&2
    echo "Error details:"
    
    # Extract and format specific error fields for better diagnostics
    message=$(echo "$body" | jq -r '.message // "Unknown error"')
    error=$(echo "$body" | jq -r '.error // "No additional error details"')
    cause=$(echo "$body" | jq -r '.cause // "No cause specified"')
    operation=$(echo "$body" | jq -r '.operation // "Unknown operation"')
    
    echo "  Message: $message"
    echo "  Error: $error"
    
    # Only show these if they exist and are not null
    if [[ "$cause" != "null" && "$cause" != "No cause specified" ]]; then
      echo "  Cause: $cause"
    fi
    
    if [[ "$operation" != "null" && "$operation" != "Unknown operation" ]]; then
      echo "  Failed operation: $operation"
    fi
    
    # Show the stack trace if available for debugging
    stack=$(echo "$body" | jq -r '.stack // ""')
    if [[ -n "$stack" && "$stack" != "null" ]]; then
      echo "  Stack trace for debugging:"
      echo "$stack" | sed 's/^/    /'
    fi
    
    # Full JSON response for complete details
    echo "Full error response:"
    echo "$body" | jq '.'
    
    # Exit with error
    exit 1
  fi
  
  echo "Database operation successful!"
  echo "Response:"
  echo "$body" | jq '.'
else
  echo "Error: Failed to invoke Lambda function" 1>&2
  exit 1
fi