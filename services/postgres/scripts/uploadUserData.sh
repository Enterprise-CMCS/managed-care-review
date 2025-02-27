#!/bin/bash

# This script uploads VM initialization files to an S3 bucket created by CloudFormation

set -e  # Exit on any error

if [ -z "$1" ]; then
    echo "Error: Stage name not provided"
    echo "Usage: $0 <stage_name>"
    exit 1
fi

STAGE_NAME="$1"
STACK_NAME="postgres-${STAGE_NAME}"
SCRIPT_DIR="scripts"
FILES=("vm-startup.sh" "vm-shutdown.sh" "slack-notify.service" "authorized_keys")

# Check if this is a stage that uses the bucket
# Temporarily including mtsechubsmrotation stage for testing
if [[ "$STAGE_NAME" != "main" && "$STAGE_NAME" != "val" && "$STAGE_NAME" != "prod" && "$STAGE_NAME" != "mtsechubsmrotation" ]]; then
    echo "Stage ${STAGE_NAME} does not use VM scripts bucket. Skipping upload."
    exit 0
fi

# Validate that we're in the right directory
if [ ! -d "$SCRIPT_DIR" ]; then
    echo "Error: Script directory not found: $SCRIPT_DIR"
    echo "Please run this script from the repository root"
    exit 1
fi

# Validate that all required files exist
for file in "${FILES[@]}"; do
    if [ ! -f "$SCRIPT_DIR/$file" ]; then
        echo "Error: Required file not found: $SCRIPT_DIR/$file"
        exit 1
    fi
done

echo "Getting bucket name from CloudFormation stack: $STACK_NAME"

# Wait for CloudFormation stack to be fully updated
sleep 5

# Get bucket name from CloudFormation
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`PostgresVMScriptsBucket`].OutputValue' \
    --output text)

if [ -z "$BUCKET_NAME" ]; then
    echo "Error: Could not find S3 bucket name from CloudFormation stack"
    exit 1
fi

echo "Found bucket: $BUCKET_NAME"

# Upload each script
for file in "${FILES[@]}"; do
    echo "Uploading $file..."
    if aws s3 cp "$SCRIPT_DIR/$file" "s3://$BUCKET_NAME/files/$file"; then
        echo "Successfully uploaded $file"
    else
        echo "Error: Failed to upload $file"
        exit 1
    fi
done

echo "All files successfully uploaded to s3://$BUCKET_NAME/files/"