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
  echo "Usage: $0 create|delete stageName dbSecretArn" 1>&2
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
  
  # Check if the response is valid JSON
  if ! jq empty lambda_response.json 2>/dev/null; then
    echo "Error: Lambda function returned invalid JSON" 1>&2
    cat lambda_response.json
    exit 1
  fi
  
  # Extract and check the status code
  body=$(jq -r '.body' lambda_response.json)
  if [[ -z "$body" || "$body" == "null" ]]; then
    echo "Error: Lambda response missing body field" 1>&2
    cat lambda_response.json
    exit 1
  fi
  
  # Parse the body which is a JSON string
  status_code=$(echo "$body" | jq -r '.statusCode // 500')
  
  if [[ "$status_code" != "200" ]]; then
    echo "Error: Database operation failed with status code $status_code" 1>&2
    cat lambda_response.json
    exit 1
  fi
  
  echo "Database operation successful!"
  echo "Response:"
  echo "$body" | jq '.'
else
  echo "Error: Failed to invoke Lambda function" 1>&2
  exit 1
fi